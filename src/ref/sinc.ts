import { createSymmetricFilter } from "./filters";
import { blackmanNuttallWindow } from "./funcs";

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
  /** The integer number of samples between the center of the filter and the edge of its window. */
  radius: number;

  /** The interval between adjacent symbols, in samples. */
  interval: number;
}

/**
 * Creates a filter function that applies a normalized sinc low pass filter. The sinc function is
 * truncated using a Blackman-Nuttall window.
 *
 * @param options The filter options.
 * @returns The filter function.
 */
export const createSincFilter = (options: SincFilterOptions) => {
  const { radius, interval } = options;

  const coeffs = new Float32Array(radius);
  for (let i = 0; i < radius; i++) {
    const window = blackmanNuttallWindow(i / radius);
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
export const createSincBandPassFilter = (options: SincFilterOptions & { width: number }) => {
  const { radius, interval, width } = options;

  const highFreqInterval = interval - width / 2;
  const lowFreqInterval = interval + width / 2;
  const scale = lowFreqInterval / highFreqInterval;

  const coeffs = new Float32Array(radius);
  for (let i = 0; i < radius; i++) {
    const window = blackmanNuttallWindow(i / radius);
    const highFreq = sinc(i / highFreqInterval);
    const lowFreq = sinc(i / lowFreqInterval);
    coeffs[i] = (scale * highFreq - lowFreq) * window;
  }
  return createSymmetricFilter(coeffs);
};

/**
 * Creates a filter function that applies a normalized sinc root nyquist filter.
 *
 * @param options The filter options.
 * @returns The filter function.
 */
export const createSincRootNyquistFilter = (options: SincFilterOptions) => {
  const { radius, interval } = options;
  return createSincFilter({ radius, interval: interval * 0.975 });
};
