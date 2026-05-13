import { expect, test } from "vitest";

import { blackmanNuttallWindow } from "./funcs.js";

test.suite("Blackman-Nuttall Window", () => {
  test("points", () => {
    expect(blackmanNuttallWindow(0)).toBeCloseTo(1.0);
    expect(blackmanNuttallWindow(-1)).toBeCloseTo(0.0);
    expect(blackmanNuttallWindow(1)).toBeCloseTo(0.0);
    expect(blackmanNuttallWindow(-0.999)).toBeCloseTo(0.0);
    expect(blackmanNuttallWindow(0.999)).toBeCloseTo(0.0);
  });

  test("area", () => {
    let small = 0;
    {
      const radius = 100;
      for (let i = -radius; i <= radius; i++) {
        small += blackmanNuttallWindow(i / radius);
      }
    }
    expect(small).toBeCloseTo(72.7167);

    // Large area is a hair more than 100x the small one because of sampling.
    let large = 0;
    {
      const radius = 10000;
      for (let i = -radius; i <= radius; i++) {
        large += blackmanNuttallWindow(i / radius);
      }
    }
    expect(large).toBeCloseTo(7271.638);
  });
});
