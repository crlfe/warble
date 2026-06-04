import { type JSXElement } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";

import {
  assertNotNull,
  createLindebergTimeCausalFilter,
  createRrcFilter,
  nuttallWindow,
} from "#warble/ref";

const _debugPaint = (data: Float32Array, options?: { xGrid?: number; yGrid?: number }) => {
  const { xGrid, yGrid } = options ?? {};

  const width = Math.min(8 * 1024, data.length);
  const height = 512;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("style", `border:1px solid #000;width:${width}px;height:${height}px`);
  canvas.width = width;
  canvas.height = height;
  document.body.append(canvas);

  const g = assertNotNull(canvas.getContext("2d"));

  let extent = 0.01;
  for (let i = 0; i < data.length; i++) {
    extent = Math.max(extent, Math.abs(data[i]));
  }

  const xScale = width / data.length;
  const yScale = 0.5 / extent;

  if (xGrid) {
    g.beginPath();
    for (let i = 0; i < data.length; i += xGrid) {
      const x = i * xScale;
      g.moveTo(x, 0);
      g.lineTo(x, height);
    }
    g.strokeStyle = "#0004";
    g.stroke();
  }
  if (yGrid === 0) {
    const y = 0.5 * height;

    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(width, y);
    g.strokeStyle = "#0004";
    g.stroke();
  }

  g.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = i * xScale;
    const y = (0.5 - data[i] * yScale) * height;

    if (!i) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokeStyle = "#000";
  g.stroke();

  return g;
};

const main = () => {
  const [state] = createStore({
    sampleRate: 96_000,
    carrierFreq: 4000,
    symbolRate: 1000,
    rampTimeMs: 50,
    skipTimeMs: 50,
  });

  let sendText: JSXElement;
  let recvText: JSXElement;

  // Saving a file uses URL.createObjectURL. Keep the latest URL here, so that
  // we can release it before creating a new one.
  let lastSaveURL = "";

  const createMessageBuffer = (bytes: Uint8Array): Float32Array<ArrayBuffer> => {
    const { sampleRate, carrierFreq, symbolRate, rampTimeMs } = state;
    const symbolInterval = sampleRate / symbolRate;

    const dataLength = Math.ceil(bytes.length * 8 * (sampleRate / symbolRate));
    const rampLength = Math.ceil(sampleRate * (rampTimeMs / 1000));
    const length = rampLength + dataLength + rampLength;

    // Generate BPSK impulses with a reduced angle.
    let phase = new Float32Array(length);
    // TODO: Iterate over bit indexes rather that going backwards.
    for (let t = rampLength % symbolInterval; t < phase.length; t += symbolInterval) {
      const i = (t - rampLength) / symbolInterval;
      if (i >= 0 && i < 8 * bytes.length) {
        const bit = (bytes[Math.floor(i / 8)] >>> Math.floor(i % 8)) & 1;
        phase[t] = (bit ? -0.15 : 0.15) * Math.PI;
      }
    }

    // Spread the BPSK impulse with a Root Raised Cosine filter.
    const rrcFilter = createRrcFilter({
      rolloff: 0.25,
      interval: symbolInterval,
      radius: Math.ceil(symbolInterval * 8),
    });

    phase = rrcFilter(phase);

    // Modulate the carrier wave with the filtered phase angles.
    const samples = new Float32Array(length);
    const gain = 0.9;
    const indexToCarrierAngle = (2 * Math.PI * carrierFreq) / sampleRate;
    let i = 0;
    for (let j = 0; j < rampLength; j++, i++) {
      const window = nuttallWindow(j / rampLength - 1);
      samples[i] = gain * window * Math.sin(i * indexToCarrierAngle + phase[i]);
    }
    for (let j = 0; j < dataLength; j++, i++) {
      samples[i] = gain * Math.sin(i * indexToCarrierAngle + phase[i]);
    }
    for (let j = 0; j < rampLength; j++, i++) {
      const window = nuttallWindow(j / rampLength);
      samples[i] = gain * window * Math.sin(i * indexToCarrierAngle + phase[i]);
    }

    return samples;
  };

  const createMessageBuffers = () => {
    if (!(sendText instanceof HTMLTextAreaElement)) {
      throw new TypeError();
    }

    const lines = sendText.value.split("\n").map((s) => s.trim());

    const buffers: Float32Array<ArrayBuffer>[] = [];
    for (const line of lines) {
      const bytes = new TextEncoder().encode(line);
      buffers.push(createMessageBuffer(bytes));
    }

    return buffers;
  };

  const decodeMessage = (iValues: Float32Array, qValues: Float32Array): void => {
    const { sampleRate, symbolRate } = state;
    const symbolInterval = sampleRate / symbolRate;

    const length = iValues.length;

    if (!(recvText instanceof HTMLTextAreaElement)) {
      throw new TypeError();
    }

    // Extract the phase angles containing our data.

    // TODO: To support real communication we need to use the ramp to compute an
    // initial iCenter/qCenter values, and then adjust them intelligently during
    // the message. The quick hack with 'p' is probably insufficient.

    let phase = new Float32Array(length);
    let iCenter = 1;
    let qCenter = 0;
    for (let i = 0; i < length; i++) {
      const xpr = iValues[i] * qCenter - qValues[i] * iCenter;
      const iMag = Math.max(Math.hypot(iValues[i], qValues[i]), 0.5);
      const cMag = Math.max(Math.hypot(iCenter, qCenter), 0.5);
      phase[i] = Math.asin(xpr / iMag / cMag);

      const p = 1 / (i + 1) / iMag / cMag;
      iCenter = iCenter * (1 - p) + iValues[i] * p;
      qCenter = qCenter * (1 - p) + qValues[i] * p;
    }

    // Apply the second RRC filter to amplify the data in the phase angles.
    const rrcFilter = createRrcFilter({
      rolloff: 0.25,
      interval: symbolInterval,
      radius: Math.ceil(symbolInterval * 8),
    });
    phase = rrcFilter(phase);

    let extent = 0;
    for (let i = 0; i < phase.length; i++) {
      extent = Math.max(extent, Math.abs(phase[i]));
    }

    // Mark the region of the processed phases that contains data.
    let begin = 0;
    for (; begin < length; begin++) {
      if (Math.abs(phase[begin]) > 0.25 * extent) break;
    }

    let end = length;
    for (; end > begin; end--) {
      if (Math.abs(phase[end - 1]) > 0.25 * extent) break;
    }

    // Find the offset where symbol values are most consistent.
    let offset = -1;
    let offsetErr = Infinity;
    for (let i = 0; i < symbolInterval; i++) {
      let avg = 0;
      let cnt = 0;
      for (let j = begin + i; j < end; j += symbolInterval) {
        avg += Math.abs(phase[j]);
        cnt += 1;
      }
      avg /= cnt;

      let err = 0;
      for (let j = begin + i; j < end; j += symbolInterval) {
        err += Math.pow(avg - Math.abs(phase[j]), 2);
      }
      if (err < offsetErr) {
        offset = i;
        offsetErr = err;
      }
    }

    // DEBUG: _debugPaint(phase.subarray(begin + offset, end), { xGrid: symbolInterval, yGrid: 0 });

    // Extract the actual symbol bits.
    const bytes = new Uint8Array(Math.round((end - offset - begin) / symbolInterval / 8));
    for (let i = 0, t = begin + offset; i < bytes.length; i++) {
      for (let j = 0; j < 8; j++) {
        if (phase[t] > 0) {
          bytes[i] |= 1 << j;
        }
        t += symbolInterval;
      }
    }

    recvText.value += new TextDecoder().decode(bytes) + "\n";

    // DEBUG: _debugPaint(phase.subarray(begin + offset, end), { xGrid: symbolInterval, yGrid: 0 });
  };

  const decodeMessages = (buffer: Float32Array): void => {
    const { sampleRate, carrierFreq, symbolRate } = state;
    const carrierInterval = sampleRate / carrierFreq;
    const symbolInterval = sampleRate / symbolRate;

    const length = buffer.length;

    if (!(recvText instanceof HTMLTextAreaElement)) {
      throw new TypeError();
    }

    // TODO: Consider a band pass filter to reject noise early.
    // TODO: Consider replacing the time-causal filters with something symmetric.

    // Demodulate signal to PSK in-phase and quadrature components.
    const iValues = new Float32Array(length);
    const qValues = new Float32Array(length);
    {
      const iFilter = createLindebergTimeCausalFilter({ interval: carrierInterval });
      const qFilter = createLindebergTimeCausalFilter({ interval: carrierInterval });
      const indexToCarrierAngle = (2 * Math.PI) / carrierInterval;
      for (let i = 0; i < buffer.length; i++) {
        iValues[i] = iFilter(Math.sin(i * indexToCarrierAngle) * buffer[i]);
        qValues[i] = qFilter(Math.cos(i * indexToCarrierAngle) * buffer[i]);
      }
    }

    // Search for regions with phase changes across the symbol interval.
    // We have not applied the RRC filter and the actual bits are not all
    // transitions, so these are not the actual symbols. However, it is a
    // pretty good sign that we found a message rather than noise.
    const messageRanges: [number, number][] = [];
    const activeFilterInterval = 16 * symbolInterval;
    const activeFilter = createLindebergTimeCausalFilter({ interval: activeFilterInterval });
    const activeScores = new Float32Array(length);
    let currentMessageStart = -1;
    for (let i = 0; i < length - symbolInterval; i++) {
      const j = i + symbolInterval;
      const xpr = iValues[i] * qValues[j] - qValues[i] * iValues[j];
      const iMag = Math.max(Math.hypot(iValues[i], qValues[i]), 0.1);
      const jMag = Math.max(Math.hypot(iValues[j], qValues[j]), 0.1);

      const active = activeFilter(Math.abs(xpr / iMag / jMag));
      activeScores[i] = active;
      if (active > 1e-3) {
        if (currentMessageStart < 0) {
          currentMessageStart = i - 2 * activeFilterInterval;
        }
      } else if (currentMessageStart >= 0) {
        messageRanges.push([currentMessageStart, i - activeFilterInterval]);
        currentMessageStart = -1;
      }
    }
    if (currentMessageStart >= 0) {
      messageRanges.push([currentMessageStart, length]);
    }

    recvText.value = `Received ${messageRanges.length} lines:\n`;
    for (const range of messageRanges) {
      decodeMessage(iValues.subarray(range[0], range[1]), qValues.subarray(range[0], range[1]));
    }
  };

  const onPlayClick = () => {
    const { sampleRate, skipTimeMs } = state;

    const messageBuffers = createMessageBuffers();

    const context = new AudioContext({ latencyHint: "playback", sampleRate });
    context.suspend();

    let when = skipTimeMs / 1000;
    for (const samples of messageBuffers) {
      const buffer = new AudioBuffer({ length: samples.length, sampleRate });
      buffer.copyToChannel(samples, 0);

      const source = new AudioBufferSourceNode(context, { buffer });
      source.connect(context.destination);
      source.start(when);
      when += samples.length / sampleRate + skipTimeMs / 1000;
    }

    context.resume();
  };

  const onSaveClick = () => {
    const { sampleRate, skipTimeMs } = state;
    const samplesPerMs = sampleRate / 1000;
    const skipSamples = skipTimeMs * samplesPerMs;

    const messageBuffers = createMessageBuffers();

    const chunks: ArrayBufferView<ArrayBuffer>[] = [];

    const skipBuffer = new Float32Array(skipTimeMs * samplesPerMs);

    let totalSamples = skipBuffer.length;
    chunks.push(skipBuffer);
    for (const buffer of messageBuffers) {
      chunks.push(buffer);
      chunks.push(skipBuffer);
      totalSamples += buffer.length + skipBuffer.length;
    }

    // Generate and prepend the WAV header.
    {
      const totalSamples = messageBuffers.reduce(
        (total, curr) => total + curr.length + skipSamples,
        skipSamples,
      );

      const header = new Uint8Array(44);
      const raw = new DataView(header.buffer);
      // See: https://en.wikipedia.org/wiki/WAV#WAV_file_header
      raw.setUint32(0, 0x52494646, false);
      raw.setUint32(4, header.byteLength - 8 + totalSamples * Float32Array.BYTES_PER_ELEMENT);
      raw.setUint32(8, 0x57415645, false);
      raw.setUint32(12, 0x666d7420, false);
      raw.setUint32(16, 0x10, true);
      raw.setUint16(20, 3, true); // 1 = uint, 3 = float
      raw.setUint16(22, 1, true);
      raw.setUint32(24, sampleRate, true);
      raw.setUint32(28, sampleRate * Float32Array.BYTES_PER_ELEMENT, true);
      raw.setUint16(32, Float32Array.BYTES_PER_ELEMENT, true);
      raw.setUint16(34, 8 * Float32Array.BYTES_PER_ELEMENT, true);
      raw.setUint32(36, 0x64617461, false);
      raw.setUint32(40, totalSamples * Float32Array.BYTES_PER_ELEMENT, true);
      chunks.unshift(header);
    }

    // Create a browser-local URL to reference the WAV file.
    const url = URL.createObjectURL(new Blob(chunks, { type: "audio/wav" }));
    if (lastSaveURL) URL.revokeObjectURL(lastSaveURL);
    lastSaveURL = url;

    // Generate a data stamp "YYYY-MM-DDTHH-mm-ss" using the local time zone.
    const now = new Date();
    const dateParts = [
      now.getFullYear().toFixed(0).padStart(4, "0"),
      (now.getMonth() + 1).toFixed(0).padStart(2, "0"),
      now.getDate().toFixed(0).padStart(2, "0"),
      "T",
      now.getHours().toFixed(0).padStart(2, "0"),
      now.getMinutes().toFixed(0).padStart(2, "0"),
      now.getSeconds().toFixed(0).padStart(2, "0"),
    ];

    // Create and trigger a download link for the generated WAV file.
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.download = `harris-${dateParts.join("")}.wav`;
    link.click();
  };

  const onRecordClick = () => {
    const { sampleRate } = state;

    const context = new AudioContext({ latencyHint: "playback", sampleRate });

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        const recorder = new MediaRecorder(mediaStream, {});
        recorder.start();

        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };
        recorder.onstop = () => {
          new Blob(chunks, { type: recorder.mimeType })
            ?.arrayBuffer()
            .then((array) => context.decodeAudioData(array))
            .then((buffer) => decodeMessages(buffer.getChannelData(0)));
        };

        const onClose = () => {
          for (const track of mediaStream.getTracks()) {
            track.stop();
          }

          dialog.close();
          dialog.remove();
          recorder.stop();
        };

        const dialog = (
          <dialog class="vFlow" style="width:10em" onclose={onClose}>
            <p>Recording...</p>
            <button onclick={onClose}>Stop</button>
          </dialog>
        ) as HTMLDialogElement;
        document.body.append(dialog);
        dialog.showModal();
      })
      .catch((err) => document.body.append(err));
  };

  const onLoadClick = () => {
    const { sampleRate } = state;

    const context = new AudioContext({ latencyHint: "playback", sampleRate });

    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", ".wav,audio/*");
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      file
        ?.arrayBuffer()
        .then((array) => context.decodeAudioData(array))
        .then((buffer) => decodeMessages(buffer.getChannelData(0)));
      // TODO: Error handling.
    });
    input.click();
  };

  return (
    <>
      <p>
        This proof of concept demo sends text using a very simple song: only a short pause between
        lines, with no pitch changes. There is no error detection or correction, so any glitches in
        the received signal or processing will be obvious in the output.
      </p>
      <p>
        BUG: This can not yet recover data that has been distorted by a speaker and microphone.
        Occasionally my phone can play a message that is received successfully on my laptop. Manual
        inspection shows the data is present, so it is hopefully just a matter of improving the
        decoder.
      </p>

      <h2>Send Messages</h2>
      <div class="hFlow">
        {
          (sendText = (
            <textarea style="width:20em;height:10em;flex:1">
              {"Line breaks determine\nthe\nlength of whistles"}
            </textarea>
          ))
        }
        <div class="vFlow" style="width:6em">
          <button style="flex:1" onClick={onPlayClick}>
            Play
          </button>
          <button style="flex:1" onClick={onSaveClick}>
            Save
          </button>
        </div>
      </div>

      <h2>Receive Messages</h2>
      <div class="hFlow">
        <div class="vFlow" style="width:6em">
          <button style="flex:1" onClick={onRecordClick}>
            Record
          </button>
          <button style="flex:1" onClick={onLoadClick}>
            Load
          </button>
        </div>
        {(recvText = <textarea style="width:20em;height:10em;flex:1"></textarea>)}
      </div>
    </>
  );
};

render(main, document.body);
