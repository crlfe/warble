import FFT from "fft.js";

import { nuttallWindow } from "./funcs";

export const createReferenceFFTRealToReal = (length: number) => {
  const fft = new FFT(length);
  const windowedInput = new Float32Array(length);
  const complexOutput = new Float32Array(2 * length);

  return (input: Float32Array, output?: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> => {
    for (let i = 0; i < length; i++) {
      windowedInput[i] = input[i] * nuttallWindow((2 * i) / length - 1);
    }
    fft.realTransform(complexOutput, windowedInput);

    // Translate output from [real, imag] pairs to magnitude.
    output ??= new Float32Array(length / 2);
    for (let i = 0; i < length / 2; i++) {
      const real = complexOutput[2 * i + 0];
      const imag = complexOutput[2 * i + 1];
      output[i] = Math.hypot(real, imag);
    }
    return output;
  };
};
