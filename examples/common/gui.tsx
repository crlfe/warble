import {
  type Accessor,
  createEffect,
  createSelector,
  createSignal,
  type JSX,
  onCleanup,
  type Setter,
} from "solid-js";

import { assertNotNull } from "#warble/ref";

export interface Canvas2DInfo {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export const createCanvas2DInfo = (): [
  Accessor<Canvas2DInfo | undefined>,
  Setter<HTMLCanvasElement | undefined>,
] => {
  const [getInfo, setInfo] = createSignal<Canvas2DInfo>();
  const [getCanvas, setCanvas] = createSignal<HTMLCanvasElement>();

  createEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const g = assertNotNull(canvas.getContext("2d"));
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas && entry.contentBoxSize[0]) {
          const box = entry.contentBoxSize[0];
          setInfo({ canvas, g, width: box.inlineSize, height: box.blockSize });
        }
      }
    });

    observer.observe(canvas);
    onCleanup(() => observer.unobserve(canvas));
  });

  return [getInfo, setCanvas];
};

export const Select = <K extends string>(props: {
  options: K[];
  getValue: Accessor<K | undefined>;
  setValue: (key: K) => void;
}): JSX.Element => {
  const { options, getValue, setValue, ...others } = props;
  const selector = createSelector(getValue);

  return (
    <select
      {...others}
      onInput={(event) => {
        if (event.target.validity.valid) {
          // TODO: Do we need to double-check membership in the key list?
          setValue(event.target.value as K);
        }
      }}
    >
      {options.map((key) => (
        <option value={key} selected={selector(key)}>
          {key}
        </option>
      ))}
    </select>
  );
};
