import { createSymmetricFilter } from "./filters";
import { nuttallWindow } from "./funcs";

/**
 * Compute the value of the normalized sinc function at a single position.
 *
 * @param input The input position.
 * @returns The value of the function.
 */
export const sinc = (input: number): number => {
  return input ? Math.sin(Math.PI * input) / (Math.PI * input) : 1;
};

export interface SincFilterOptions {
  /** The integer number of samples between the center of the filter and its edge. */
  radius: number;

  /** The distance between adjacent symbols, in samples. */
  interval: number;
}

/**
 * Creates a function that applies a normalized sinc filter.
 *
 * @param options The filter options.
 * @returns The filter function.
 */
export const createSincFilter = (options: SincFilterOptions) => {
  const { radius, interval } = options;

  const coeffs = new Float32Array(radius);
  for (let i = 0; i < radius; i++) {
    coeffs[i] = sinc(i / interval);
  }
  return createSymmetricFilter(coeffs);
};

/**
 * Creates a filter function that applies a normalized sinc low pass filter. The sinc function is
 * truncated using a Blackman-Nuttall window.
 *
 * @param options The filter options.
 * @returns The filter function.
 */
export const createWindowedSincFilter = (options: SincFilterOptions) => {
  const { radius, interval } = options;

  const coeffs = new Float32Array(radius);
  for (let i = 0; i < radius; i++) {
    const window = nuttallWindow(i / radius);
    coeffs[i] = sinc(i / interval) * window;
  }
  return createSymmetricFilter(coeffs);
};

/**
 * Creates a filter function that applies a normalized sinc band pass filter.
 *
 * @param options The filter options.
 * @returns The filter function.
 */
export const createWindowedSincBandPassFilter = (
  options: SincFilterOptions & { width: number },
) => {
  const { radius, interval, width } = options;

  const highFreqInterval = interval - width / 2;
  const lowFreqInterval = interval + width / 2;
  const scale = lowFreqInterval / highFreqInterval;

  const coeffs = new Float32Array(radius);
  for (let i = 0; i < radius; i++) {
    const window = nuttallWindow(i / radius);
    const highFreq = sinc(i / highFreqInterval);
    const lowFreq = sinc(i / lowFreqInterval);
    coeffs[i] = (scale * highFreq - lowFreq) * window;
  }
  return createSymmetricFilter(coeffs);
};
