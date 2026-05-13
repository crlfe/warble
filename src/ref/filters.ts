export const createSymmetricFilter = (coeffs: Float32Array) => {
  const filter = (
    input: Float32Array,
    output?: Float32Array<ArrayBuffer>,
  ): Float32Array<ArrayBuffer> => {
    const radius = coeffs.length;
    const length = input.length;
    output ??= new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let a = input[i] * coeffs[0];
      for (let j = 1; j < radius && i - j >= 0; j++) {
        a += input[i - j] * coeffs[j];
      }
      for (let j = 1; j < radius && i + j < length; j++) {
        a += input[i + j] * coeffs[j];
      }
      output[i] = a;
    }

    return output;
  };
  filter.coeffs = coeffs;
  return filter;
};
