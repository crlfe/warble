import { createReferenceFFTRealToReal } from "#warble/ref";

import { assertNotNull, html } from "./util";

export interface PlotInput {
  data: Float32Array;
  stroke: string;
  group?: number;
}

export const createSpectrogram = (width: number, height: number) => {
  const view = html("canvas", { class: "plot", width, height }, []);

  return {
    view,
    update(input: Float32Array): void {
      const g = assertNotNull(view.getContext("2d"));
      const column = g.createImageData(1, height);

      const fftSize = 2 * height;
      const fft = createReferenceFFTRealToReal(fftSize);
      let fftOutput: Float32Array<ArrayBuffer> | undefined;

      for (let x = 0; x < width; x++) {
        const begin = Math.floor((x / width) * (input.length - fftSize));
        const end = begin + fftSize;
        fftOutput = fft(input.subarray(begin, end), fftOutput);

        for (let y = 0; y < height; y++) {
          const v = 255 - 60 * Math.pow(fftOutput[height - 1 - y], 1 / 3);
          column.data[4 * y + 0] = v;
          column.data[4 * y + 1] = v;
          column.data[4 * y + 2] = v;
          column.data[4 * y + 3] = 255;
        }
        g.putImageData(column, x, 0);
      }
    },
  };
};

export const createPlot = (width: number, height: number) => {
  const view = html("canvas", { class: "plot", width, height }, []);

  return {
    view,
    update(inputs: PlotInput[], showLeft: number, showWidth: number): void {
      // TODO: Skip points outside the current view

      const g = assertNotNull(view.getContext("2d"));
      g.clearRect(0, 0, width, height);

      const groups: { maxRange: number; maxValue: number }[] = [];

      for (const input of inputs) {
        if (!input) continue;
        const group = (groups[input.group ?? 0] ??= { maxRange: 0.1, maxValue: 0.1 });
        group.maxRange = Math.max(group.maxRange, input.data.length);
        for (let i = 0; i < input.data.length; i++) {
          group.maxValue = Math.max(group.maxValue, Math.abs(input.data[i]));
        }
      }

      for (const input of inputs) {
        if (!input) continue;
        const group = assertNotNull(groups[input.group ?? 0]);

        g.beginPath();
        for (let j = 0; j < input.data.length; j++) {
          const x = ((j / group.maxRange - showLeft) / showWidth) * width;
          const y = height / 2 - (input.data[j] / (2.1 * group.maxValue)) * height;
          if (j) {
            g.lineTo(x, y);
          } else {
            g.moveTo(x, y);
          }
        }
        g.strokeStyle = input.stroke;
        g.stroke();
      }

      g.resetTransform();
    },
  };
};

export const createBar = (width: number, height: number) => {
  const view = html("canvas", { class: "plot", width, height }, []);

  return {
    view,
    update(showLeft: number, showWidth: number): void {
      const g = assertNotNull(view.getContext("2d"));

      g.clearRect(0, 0, width, height);
      g.fillStyle = "#00F";
      g.fillRect(showLeft * width, 0, showWidth * width, height);
    },
  };
};
