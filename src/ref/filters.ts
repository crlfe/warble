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

export const createLindebergTimeCausalFilter = (options: { interval: number }) => {
  // TODO: power 2.3 and divide by 30 makes the band pass roughly work. Need to do the real math.
  const scale = Math.pow(options.interval, 2.3) / 30;
  const c = Math.sqrt(2);
  const length = 4;

  const tau = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    tau[i] = scale / Math.pow(c, 2 * (length - i - 1));
  }

  const coeffs = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const deltaTau = tau[i] - (i ? tau[i - 1] : 0);
    const mu = (1 + Math.sqrt(1 + 4 * deltaTau)) / 2;
    coeffs[i] = 1 / (1 + mu);
  }

  return createRecursiveDecayFilter(coeffs);
};

export const createRecursiveDecayFilter = (coeffs: Float32Array) => {
  const length = coeffs.length;
  const values = new Float32Array(length);
  return (input: number): number => {
    for (let i = 0; i < length; i++) {
      const a = i > 0 ? values[i - 1] : input;
      values[i] += (a - values[i]) * coeffs[i];
    }
    return values[length - 1];
  };
};
