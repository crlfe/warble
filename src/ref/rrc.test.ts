import { expect, test } from "vitest";

import { createRrcFilter } from "./rrc";

test.suite("Root-Raised Cosine Function, applied twice", () => {
  test("impulse", () => {
    const length = 512;
    const input = new Float32Array(length);
    input[length / 2] = 1.0;

    const filter = createRrcFilter({ interval: 16, rolloff: 0.5, radius: 256 });
    const output = filter(filter(input));

    expect(output[length / 2]).toBeCloseTo(1.0);
    expect(output[length / 2 - 16]).toBeCloseTo(0.0);
    expect(output[length / 2 + 16]).toBeCloseTo(0.0);
    expect(output[length / 2 - 32]).toBeCloseTo(0.0);
    expect(output[length / 2 + 32]).toBeCloseTo(0.0);
  });
});
