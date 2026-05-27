import { expect, test } from "vitest";

import { nuttallWindow } from "./funcs";

test.suite("Nuttall Window", () => {
  test("points", () => {
    expect(nuttallWindow(0)).toBeCloseTo(1.0, 12);
    expect(nuttallWindow(-1)).toBeCloseTo(0.0, 12);
    expect(nuttallWindow(1)).toBeCloseTo(0.0, 12);
    expect(nuttallWindow(-0.999)).toBeCloseTo(0.0, 6);
    expect(nuttallWindow(0.999)).toBeCloseTo(0.0, 6);
  });
});
