/**
 * Compute the value of the Nuttall window function at a single position.
 *
 * The maximum value of the window occurs when the input is 0, smoothly tapering off on both sides
 * to zero by -1 and +1.
 *
 * @param input The input position.
 * @returns The value at the function.
 */
export const nuttallWindow = (input: number): number => {
  if (input < -1 || input > 1) return 0;

  const a0 = 0.355768;
  const a1 = 0.487396;
  const a2 = 0.144232;
  const a3 = 0.012604;

  const w = Math.PI * 0.5 * (input + 1);
  return a0 - a1 * Math.cos(2 * w) + a2 * Math.cos(4 * w) - a3 * Math.cos(6 * w);
};
