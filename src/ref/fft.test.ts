import { expect, test } from "vitest";

import { createReferenceFFTRealToReal } from "./fft";

test("simple", () => {
  const length = 1024;

  const input = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    input[i] = Math.sin((2 * Math.PI * i) / 32);
  }

  const fft = createReferenceFFTRealToReal(length);
  const output = fft(input);

  // Check for a peak around (length / 32)
  expect(output[25]).toBeLessThan(1);
  expect(output[32]).toBeGreaterThan(90);
  expect(output[39]).toBeLessThan(1);
});
