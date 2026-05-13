import { expect, test } from "vitest";

import { sinc } from "./sinc";

test.suite("Sinc Function", () => {
  test("points", () => {
    expect(sinc(0)).toBeCloseTo(1.0);
    expect(sinc(-1)).toBeCloseTo(0.0);
    expect(sinc(+1)).toBeCloseTo(0.0);
    expect(sinc(-0.99999999)).toBeCloseTo(0.0);
    expect(sinc(+0.99999999)).toBeCloseTo(0.0);
  });
});
