export const assertNotNull = <T>(value: T | null | undefined): T => {
  if (value == null) throw new Error();
  return value;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const createInsecurePRNG = (seed: number) => {
  let state = seed | 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = state | 0;
    return (state & 0x7fff_ffff) / 0x7fff_ffff;
  };
};
