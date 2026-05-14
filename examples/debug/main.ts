import { createReferenceFFTRealToReal } from "#warble/ref";

import { createSincBandPassFilter, createSincFilter } from "../../src/ref/sinc";
import { createBar, createPlot, createSpectrogram, pointerEmulateWheel } from "./gui";
import { clamp, html } from "./util";

const main = (): HTMLElement => {
  const length = 16 * 1024;
  const width = 1024;
  const spec = createSpectrogram(width, 512);
  const bar = createBar(width, 24);
  const plot0 = createPlot(width, 256);
  const plot1 = createPlot(width, 256);

  const input = new Float32Array(length);
  for (let i = 0; i < input.length; i++) {
    input[i] =
      Math.sin(Math.PI * i * (16 / 512)) +
      Math.sin(Math.PI * i * (128 / 512)) +
      Math.sin(Math.PI * i * (256 / 512)) +
      Math.sin(Math.PI * i * (496 / 512)) +
      (Math.random() - 0.5);
  }

  const bufferFFT = createReferenceFFTRealToReal(length);

  const inputFreq = bufferFFT(input);

  const bandPassFilter = createSincBandPassFilter({ radius: 128, interval: 4.0, width: 0.1 });
  const bandPassOutput = bandPassFilter(input);
  const bandPassFreq = bufferFFT(bandPassOutput);

  const lowPassFilter = createSincFilter({ radius: 128, interval: 3.9 });
  const lowPass = lowPassFilter(input);
  const lowPassFreq = bufferFFT(lowPass);

  const plot0Inputs = [
    { data: input, stroke: "#000" },
    { data: inputFreq, stroke: "#F00", group: 1 },
  ];

  const plot1BandPassInputs = [
    { data: bandPassOutput, stroke: "#000" },
    { data: bandPassFreq, stroke: "#F00", group: 1 },
  ];

  const plot1LowPassInputs = [
    { data: lowPass, stroke: "#000" },
    { data: lowPassFreq, stroke: "#F00", group: 1 },
  ];

  let plot1Inputs = plot1BandPassInputs;

  let showLeft = 0;
  let showWidth = 1;

  const minShowWidth = 1 / 1000;

  const buttons = Object.entries({
    "Show Input"() {
      spec.update(input);
    },
    "Show Band Pass"() {
      spec.update(bandPassOutput);
      plot1Inputs = plot1BandPassInputs;
      plot1.update(plot1Inputs, showLeft, showWidth);
    },
    "Show Low Pass"() {
      spec.update(lowPass);
      plot1Inputs = plot1LowPassInputs;
      plot1.update(plot1Inputs, showLeft, showWidth);
    },
  }).map(([label, listener]) => {
    const button = html("button", { style: "padding:1em" }, [label]);
    button.addEventListener("click", listener);
    return button;
  });

  const view = html("div", { class: "vbox", style: "touch-action:none" }, [
    html("div", { class: "hbox" }, buttons),
    spec.view,
    bar.view,
    plot0.view,
    plot1.view,
  ]);

  const updateShow = () => {
    plot0.update(plot0Inputs, showLeft, showWidth);
    plot1.update(plot1Inputs, showLeft, showWidth);
    bar.update(showLeft, showWidth);
  };

  let rafId: number | undefined;
  const scrollAndZoom = (focusX: number, deltaX: number, deltaY: number): void => {
    let newLeft = showLeft;
    let newWidth = showWidth;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      newLeft += (deltaX / width) * showWidth;
    } else {
      let change = (deltaY / width) * showWidth;
      newWidth = clamp(newWidth - change, minShowWidth, 1);
      newLeft += focusX * (showWidth - newWidth);
    }

    newLeft = clamp(newLeft, 0, 1 - newWidth);

    if (showLeft !== newLeft || showWidth !== newWidth) {
      showLeft = newLeft;
      showWidth = newWidth;
      if (rafId == null) {
        window.requestAnimationFrame(() => {
          rafId = undefined;
          updateShow();
        });
      }
    }
  };

  view.addEventListener("wheel", (event) => {
    event.preventDefault();
    // TODO: Is there a sane way to handle WheelEvent.deltaMode other than pixels?
    scrollAndZoom(event.offsetX / view.offsetWidth, event.deltaX / 4, event.deltaY / 4);
  });

  pointerEmulateWheel(view, 4);

  queueMicrotask(() => {
    spec.update(input);
    updateShow();
  });

  return view;
};

document.body.append(main());
