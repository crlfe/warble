export const createNRZEncoder = () => {
  return (input: Uint8Array, output?: Float32Array | undefined): Float32Array => {
    const bitLength = 8 * input.length;
    output ??= new Float32Array(bitLength);

    for (let inIndex = 0, outIndex = 0; inIndex < input.length; inIndex++) {
      let value = input[inIndex] & 0xff;
      for (let bit = 0; bit < 8; bit++) {
        output[outIndex] = value & 1 ? +1 : -1;
        value >>>= 1;
        outIndex++;
      }
    }
    return output;
  };
};

export const createNRZDecoder = () => {
  return (input: Float32Array, output?: Uint8Array | undefined): Uint8Array => {
    const byteLength = Math.ceil(input.length / 8);
    output ??= new Uint8Array(byteLength);

    for (let inIndex = 0, outIndex = 0; inIndex < input.length; outIndex++) {
      let value = 0;
      for (let bit = 0; bit < 8; bit++) {
        if (input[inIndex] > 0) {
          value |= 1;
        }
        value <<= 1;
        inIndex++;
      }
      output[outIndex] = value;
    }
    return output;
  };
};

export const createAMIEncoder = () => {
  return (input: Uint8Array, output?: Float32Array | undefined): Float32Array => {
    const bitLength = 8 * input.length;
    output ??= new Float32Array(bitLength);

    let oneSignal = 1;
    for (let inIndex = 0, outIndex = 0; inIndex < input.length; inIndex++) {
      let value = input[inIndex] & 0xff;
      for (let bit = 0; bit < 8; bit++) {
        if (value & 1) {
          output[outIndex] = oneSignal;
          oneSignal = -oneSignal;
        }
        value >>>= 1;
        outIndex++;
      }
    }
    return output;
  };
};

export const createAMIDecoder = () => {
  const threshold = 0.5;

  return (input: Float32Array, output?: Uint8Array | undefined): Uint8Array => {
    const byteLength = Math.ceil(input.length / 8);
    output ??= new Uint8Array(byteLength);

    for (let inIndex = 0, outIndex = 0; inIndex < input.length; outIndex++) {
      let value = 0;
      for (let bit = 0; bit < 8; bit++) {
        // TODO: Take advantage of knowing that the high bits alternate polarity.
        if (Math.abs(input[inIndex]) > threshold) {
          value |= 1;
        }
        value <<= 1;
        inIndex++;
      }
      output[outIndex] = value;
    }
    return output;
  };
};
