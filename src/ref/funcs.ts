/**
 * Compute the value of the Blackman-Nuttall window function at a single position.
 *
 * The maximum value of the window occurs when the input is 0, smoothly tapering off on both sides
 * to zero by -1 and +1.
 *
 * @param input The input position.
 * @returns The value of the function.
 */
export const blackmanNuttallWindow = (input: number): number => {
  if (input < -1 || input > 1) return 0;

  const a0 = 0.3635819;
  const a1 = 0.4891775;
  const a2 = 0.1365995;
  const a3 = 0.0106411;
  const w = Math.PI * 0.5 * (input + 1);
  return a0 - a1 * Math.cos(2 * w) + a2 * Math.cos(4 * w) - a3 * Math.cos(6 * w);
};
