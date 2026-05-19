import {
  Accessor,
  type Component,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  JSX,
  onCleanup,
  type Setter,
} from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";

import {
  assertNotNull,
  clamp,
  createInsecurePRNG,
  createReferenceFFTRealToReal,
  createSincFilter,
  createWindowedSincFilter,
} from "#warble/ref";

const [getTimeShared, setTimeShared] = createSignal({ center: 0.5, radius: 1 / 40 });

const setValueAsNumberWhenValid =
  <T, Args extends readonly unknown[]>(store: SetStoreFunction<T>, ...args: Args) =>
  (event: Event & { target: HTMLInputElement }) => {
    if (event.target.validity.valid) {
      (store as any)(...args, event.target.valueAsNumber);
    }
  };

interface Canvas2DInfo {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  width: number;
  height: number;
}

const createCanvas2DInfo = (): [
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

const Select = <K extends string>(props: {
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

export const pointerEmulateWheel = (target: HTMLElement, scale = 4): void => {
  let dragState:
    | { pointerId: number; firstX: number; firstY: number; lastX: number; lastY: number }
    | undefined;

  const onPointerDrag = (event: PointerEvent) => {
    if (!dragState) return;
    event.preventDefault();

    const deltaLimit = 32;
    const deltaX = clamp(dragState.lastX - event.x, -deltaLimit, deltaLimit) * scale;
    const deltaY = clamp(dragState.lastY - event.y, -deltaLimit, deltaLimit) * scale;

    const wheelEvent = new WheelEvent("wheel", {
      clientX: dragState.firstX,
      clientY: dragState.firstY,
      deltaX,
      deltaY,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
    });
    dragState.lastX = event.clientX;
    dragState.lastY = event.clientY;
    target.dispatchEvent(wheelEvent);
  };

  target.addEventListener("pointerdown", (event) => {
    if (dragState && target.hasPointerCapture(dragState.pointerId)) {
      // Already have a drag in process, so ignore additional.
      // TODO: Deliver pinch-to-zoom as ctrl+wheel.
      return;
    }

    event.preventDefault();
    dragState = {
      pointerId: event.pointerId,
      firstX: event.x,
      firstY: event.y,
      lastX: event.x,
      lastY: event.y,
    };
    target.addEventListener("pointermove", onPointerDrag);
    target.setPointerCapture(event.pointerId);
  });

  target.addEventListener("pointerup", (event) => {
    target.removeEventListener("pointermove", onPointerDrag);
    target.releasePointerCapture(event.pointerId);
    dragState = undefined;
  });
};

export const SourceBlock: Component<{
  setOutput: (output: Float32Array | undefined) => void;
}> = (props) => {
  const [state, setState] = createStore({
    mode: "symbols" as "noise" | "impulse" | "symbols",
    amplitude: 1.0,
    interval: 32,
  });

  const output = createMemo(() => {
    const { mode, amplitude, interval } = state;

    const length = 16 * 1024;
    const random = createInsecurePRNG(12345);
    const output = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      if (mode === "noise") {
        output[i] = 2 * random() - 1;
      } else if (mode === "impulse") {
        if (i === length / 2) {
          output[i] = amplitude;
        }
      } else if (mode === "symbols") {
        if (!(i % interval) && i >= interval && i + interval < length) {
          output[i] = random() < 0.5 ? -amplitude : +amplitude;
        }
      }
    }

    return output;
  });

  createEffect(() => {
    props.setOutput(output());
  });

  return (
    <details class="block" open>
      <summary>
        Source
        <span class="extra">
          : Generate {state.mode} with amplitude {state.amplitude.toFixed(1)}
          {state.mode === "symbols" && (
            <>
              {" and interval "}
              {state.interval}
            </>
          )}
        </span>
      </summary>
      <div class="vbox">
        <form class="hbox">
          <label>
            {"Generate "}
            <Select
              options={["noise", "impulse", "symbols"]}
              getValue={() => state.mode}
              setValue={(v) => setState("mode", v)}
            />
          </label>
          <label>
            {"with amplitude "}
            <input
              onChange={setValueAsNumberWhenValid(setState, "amplitude")}
              type="number"
              value="1.0"
              min="0.1"
              max="1.0"
              step="0.05"
              required
            />
          </label>
          {state.mode === "symbols" && (
            <label>
              {"and interval "}
              <input
                onChange={setValueAsNumberWhenValid(setState, "interval")}
                type="number"
                value={state.interval}
                min="4"
                max="200"
                step="1"
                required
              />
            </label>
          )}
        </form>
        <ViewerPane inputs={{ output }} interval={state.interval} />
      </div>
    </details>
  );
};

export const ViewerPane: Component<{
  open?: boolean;
  inputs: Record<string, () => Float32Array | undefined>;
  interval?: number;
}> = (props) => {
  const [getShowing, setShowing] = createSignal(true);
  const [getMode, setMode] = createSignal<"amplitude" | "frequency">("amplitude");
  const [getInputName, setInputName] = createSignal<string>();
  const [getCanvasInfo, setCanvas] = createCanvas2DInfo();

  let lastCanvas: HTMLCanvasElement | undefined;

  createEffect(() => {
    setShowing(props.open ?? true);
  });

  createEffect(() => {
    const names = Object.keys(props.inputs);
    if (!names.length) {
      setInputName(undefined);
    } else {
      setInputName(names[0]);
    }
  });

  createEffect(() => {
    if (!getShowing()) return;

    const mode = getMode();

    const info = getCanvasInfo();
    if (!info) return;

    if (lastCanvas !== info.canvas) {
      pointerEmulateWheel(info.canvas);
      lastCanvas = info.canvas;
    }

    const { canvas: target, width, height } = info;
    target.width = width;
    target.height = height;

    const g = target.getContext("2d");
    if (!g) return;

    const printError = (text: string): void => {
      // TODO: Should display text using an HTML overlay rather than painting it.
      g.font = "1em sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, width / 2, height / 2);
    };

    g.clearRect(0, 0, width, height);

    const input = props.inputs[getInputName() ?? ""]?.();
    if (!input) {
      printError("no data available");
      return;
    }
    const length = input.length;

    const yPad = 6;

    if (mode === "amplitude") {
      const time = getTimeShared();

      const begin = Math.floor((time.center - time.radius) * length);
      const end = Math.ceil((time.center + time.radius) * length);

      let extent = 1e-6;
      for (let i = 0; i < length; i++) {
        extent = Math.max(extent, Math.abs(input[i]));
      }

      g.beginPath();
      // Draw Y grid.
      for (const t of [-1.0, 0, 1.0]) {
        const y = 0.5 * (1 - t / extent) * (height - 2 * yPad) + yPad;
        g.moveTo(0, y);
        g.lineTo(width, y);
      }

      // Draw X grid.
      const interval = props.interval;
      if (interval) {
        for (let i = 0; i < length; i += interval) {
          if (i >= begin && i <= end) {
            const x = ((i - begin) / (end - 1 - begin)) * width;
            g.moveTo(x, yPad);
            g.lineTo(x, height - yPad);
          }
        }
      }
      g.strokeStyle = "#0003";
      g.stroke();

      // Draw current series.
      g.beginPath();
      for (let i = begin; i <= end; i++) {
        const x = ((i - begin) / (end - 1 - begin)) * width;
        const y = 0.5 * (1 - input[clamp(i, 0, length)] / extent) * (height - 2 * yPad) + yPad;

        if (!i) g.moveTo(x, y);
        else g.lineTo(x, y);
      }

      g.strokeStyle = "#000";
      g.stroke();

      g.fillStyle = "#00F";
      g.fillRect((time.center - time.radius) * width, height - 3, 2 * time.radius * width, 3);
    } else if (mode === "frequency") {
      // TODO: Support non-power-of-two lengths and reuse the FFT.
      const freq = createReferenceFFTRealToReal(length)(input);

      let max = 0;
      for (let i = 0; i < freq.length; i++) {
        max = Math.max(max, freq[i]);
      }

      g.beginPath();
      for (let i = 0; i < freq.length; i++) {
        const x = Math.log2(1 + i / freq.length) * width;
        const y = (1 - freq[i] / max) * (height - 12) + 6;

        if (!i) g.moveTo(x, y);
        else g.lineTo(x, y);
      }

      g.strokeStyle = "#000";
      g.stroke();
    } else {
      printError("internal error");
      return;
    }
  });

  const onWheel = (event: WheelEvent & { currentTarget: HTMLElement }) => {
    // TODO: Handle non-pixel-scale events.

    const time = getTimeShared();
    const mode = getMode();

    if (mode === "amplitude") {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault();

        let dx = clamp(event.deltaX, -256, 256);
        dx *= time.radius / 1024;

        const center = clamp(time.center + dx, time.radius, 1 - time.radius);
        setTimeShared({ center, radius: time.radius });
      } else {
        event.preventDefault();

        let dy = clamp(-event.deltaY, -256, 256);
        dy *= time.radius / 2048;

        // TODO: Scale minimum with actual number of samples.
        const radius = clamp(time.radius + dy, 0.001, 0.5);

        let center = time.center;
        const eventX = event.offsetX / event.currentTarget.offsetWidth;
        center += (time.radius - radius) * (2 * eventX - 1);
        center = clamp(center, radius, 1 - radius);

        setTimeShared({ center, radius });
      }
    }
  };

  const inputSelector = (): JSX.Element => {
    const names = Object.keys(props.inputs);
    if (!names.length) {
      return "";
    } else if (names.length === 1) {
      return <div style="line-height:1.5em">of {names[0]}</div>;
    } else {
      return (
        <>
          {"of "}
          <Select options={names} getValue={getInputName} setValue={setInputName} />
        </>
      );
    }
  };

  return (
    <>
      <form class="hbox">
        <input type="checkbox" checked onChange={(event) => setShowing(event.target.checked)} />
        <label>
          {"Show "}
          <Select
            options={["amplitude", "frequency"]}
            getValue={() => getMode()}
            setValue={(v) => setMode(v)}
          />
        </label>
        {inputSelector()}
      </form>
      {getShowing() && (
        <canvas
          style="display:block;border:1px solid #000;width:100%;height:258px"
          ref={setCanvas}
          onWheel={onWheel}
        ></canvas>
      )}
    </>
  );
};

export const FilterBlock: Component<{
  input: Float32Array | undefined;
  setOutput: (value: Float32Array | undefined) => void;
}> = (props) => {
  const [state, setState] = createStore({
    mode: "windowed sinc" as "truncated sinc" | "windowed sinc",
    interval: 32,
    radius: 256,
  });

  const createFilter = () => {
    const { mode, interval, radius } = state;

    return {
      "truncated sinc": createSincFilter,
      "windowed sinc": createWindowedSincFilter,
    }[mode]?.({ interval, radius });
  };

  const output = createMemo(() => {
    const input = props.input;
    if (!input) return undefined;

    return createFilter()?.(input);
  });

  createEffect(() => {
    props.setOutput(output());
  });

  return (
    <details class="block" open>
      <summary>
        Filter
        <span class="extra">
          : Apply {state.mode} with interval {state.interval}
        </span>
      </summary>
      <div class="vbox">
        <form class="hbox">
          <label>
            {"Apply "}
            <Select
              options={["truncated sinc", "windowed sinc"]}
              getValue={() => state.mode}
              setValue={(v) => setState("mode", v)}
            />
          </label>
          <label>
            {"with interval "}
            <input
              onChange={setValueAsNumberWhenValid(setState, "interval")}
              type="number"
              value={state.interval}
              min="4"
              max="200"
              step="1"
              required
            />
          </label>
          <label>
            {"and radius "}
            <input
              onChange={setValueAsNumberWhenValid(setState, "radius")}
              type="number"
              value={state.radius}
              min="8"
              max="1024"
              step="1"
              required
            />
          </label>
        </form>
        <ViewerPane
          inputs={{ output, filter: () => createFilter()?.coeffs }}
          interval={state.interval}
        />
      </div>
    </details>
  );
};
