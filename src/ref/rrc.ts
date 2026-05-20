import { createSymmetricFilter } from "./filters";
import { blackmanNuttallWindow } from "./funcs";

/** Compute the value of the square-root raised cosine function at a single position. */
export const rrc = (position: number, interval: number, rolloff: number): number => {
  // TODO: Quick hack to avoid divide-by-zero. Should compute the actual limits.
  position += 1e-9;
  rolloff += 1e-9;

  // TODO: Based on <https://engineering.purdue.edu/~ee538/SquareRootRaisedCosine.pdf> the
  // 'a' should start with (2 * rolloff). However 4 means that a double application has the
  // expected amplitude.
  //
  // A citation in <https://gssc.esa.int/navipedia/index.php/Square-Root_Raised_Cosine_Signals_(SRRC)>
  // for the corrected formula points to E.A. Lee and D.B. Messerschmitt, Digital Communications, 2nd edition.
  const a = (4 * rolloff) / (Math.PI * Math.sqrt(interval));
  const c = ((1 + rolloff) * Math.PI) / interval;
  const s = ((1 - rolloff) * Math.PI) / interval;
  const d = (4 * rolloff) / interval;

  const num = a * (Math.cos(c * position) + Math.sin(s * position) / (d * position));
  const den = 1 - Math.pow(d * position, 2);
  return num / den;
};

export interface RrcFilterOptions {
  radius: number;
  rolloff: number;
  interval: number;
}

export const createRrcFilter = (options: RrcFilterOptions) => {
  const { interval, rolloff, radius } = options;

  const coeffs = new Float32Array(radius);
  for (let i = 0; i < radius; i++) {
    coeffs[i] = rrc(i, interval, rolloff);
  }
  return createSymmetricFilter(coeffs);
};

export const createWindowedRrcFilter = (options: RrcFilterOptions) => {
  const { interval, rolloff, radius } = options;

  const coeffs = new Float32Array(radius);
  for (let i = 0; i < radius; i++) {
    const window = blackmanNuttallWindow(i / radius);
    coeffs[i] = rrc(i, interval, rolloff) * window;
  }
  return createSymmetricFilter(coeffs);
};
