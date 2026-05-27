import {
  type Accessor,
  type Component,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  type JSX,
  onCleanup,
  type Setter,
} from "solid-js";
import { createStore, type SetStoreFunction, type StoreReturn } from "solid-js/store";

import {
  assertNotNull,
  clamp,
  createInsecurePRNG,
  createReferenceFFTRealToReal,
  createRrcFilter,
  createSincFilter,
  createWindowedRrcFilter,
  createWindowedSincFilter,
  type RrcFilterOptions,
} from "#warble/ref";

const [getTimeShared, setTimeShared] = createSignal({ center: 0.5, radius: 1 / 40 });
const [getFreqShared, setFreqShared] = createSignal({ center: 0.5, radius: 0.5 });

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

export interface SourceBlockState {
  mode: "sine" | "noise" | "impulse" | "symbols";
  amplitude: number;
  interval: number;
  viewer: ViewerPaneState;
}

export const SourceBlock: Component<{
  state: StoreReturn<SourceBlockState>;
  setOutput: (output: Float32Array | undefined) => void;
}> = (props) => {
  const output = createMemo(() => {
    const { mode, amplitude, interval } = props.state[0];

    const length = 16 * 1024;
    const random = createInsecurePRNG(12345);
    const output = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      if (mode === "sine") {
        output[i] = Math.sin((Math.PI * i) / interval) * amplitude;
      } else if (mode === "noise") {
        output[i] = (2 * random() - 1) * amplitude;
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
          : Generate {props.state[0].mode} with amplitude {props.state[0].amplitude.toFixed(1)}
          {["sine", "symbols"].includes(props.state[0].mode) && (
            <>
              {" and interval "}
              {props.state[0].interval}
            </>
          )}
        </span>
      </summary>
      <div class="vbox">
        <form class="hbox">
          <label>
            {"Generate "}
            <Select
              options={["sine", "noise", "impulse", "symbols"]}
              getValue={() => props.state[0].mode}
              setValue={(v) => props.state[1]("mode", v)}
            />
          </label>
          <label>
            {"with amplitude "}
            <input
              onChange={setValueAsNumberWhenValid(props.state[1], "amplitude")}
              type="number"
              value="1.0"
              min="0.1"
              max="1.0"
              step="0.05"
              required
            />
          </label>
          {["sine", "symbols"].includes(props.state[0].mode) && (
            <label>
              {"and interval "}
              <input
                onChange={setValueAsNumberWhenValid(props.state[1], "interval")}
                type="number"
                value={props.state[0].interval}
                min="4"
                max="200"
                step="1"
                required
              />
            </label>
          )}
        </form>
        <ViewerPane
          state={createStore(props.state[0].viewer)}
          inputs={{ output }}
          interval={
            ["sine", "symbols"].includes(props.state[0].mode) ? props.state[0].interval : undefined
          }
        />
      </div>
    </details>
  );
};

export interface ViewerPaneState {
  showing: boolean;
  mode: "amplitude" | "frequency";
  inputName: string;
  frequencyX: "log" | "linear";
}

export const getDefaultViewerPaneState = (): ViewerPaneState => ({
  showing: true,
  mode: "amplitude",
  inputName: "output",
  frequencyX: "log",
});

export const ViewerPane: Component<{
  state: StoreReturn<ViewerPaneState>;
  open?: boolean;
  inputs: Record<string, () => Float32Array | undefined>;
  interval?: number;
}> = (props) => {
  const [getCanvasInfo, setCanvas] = createCanvas2DInfo();

  let lastCanvas: HTMLCanvasElement | undefined;

  createEffect(() => {
    props.state[1]("showing", props.open ?? true);
  });

  createEffect(() => {
    const names = Object.keys(props.inputs);
    props.state[1]("inputName", names[0] ?? "");
  });

  createEffect(() => {
    if (!props.state[0].showing) return;

    const mode = props.state[0].mode;

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

    const input = props.inputs[props.state[0].inputName]?.();
    if (!input) {
      printError("no data available");
      return;
    }
    const length = input.length;

    const yPad = 6;

    if (mode === "amplitude") {
      const scroll = getTimeShared();

      const begin = Math.floor((scroll.center - scroll.radius) * length);
      const end = Math.ceil((scroll.center + scroll.radius) * length);

      let min = Infinity;
      let max = -Infinity;
      let extent = 1e-6;
      for (let i = 0; i < length; i++) {
        min = Math.min(min, input[i]);
        max = Math.max(max, input[i]);
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
            g.moveTo(x, 0);
            g.lineTo(x, height);
          }
        }
      }
      g.strokeStyle = "#0003";
      g.stroke();

      // Show the maximum and minimum values.
      g.font = "0.75em sans-serif";
      g.fillStyle = "#000";
      g.textAlign = "right";
      g.textBaseline = "top";
      g.fillText(`max = ${max.toFixed(3)}`, width - 2, 2);
      g.textBaseline = "bottom";
      g.fillText(`min = ${min.toFixed(3)}`, width - 2, height - 2);

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
      g.fillRect((scroll.center - scroll.radius) * width, height - 3, 2 * scroll.radius * width, 3);
    } else if (mode === "frequency") {
      const scroll = getFreqShared();

      // TODO: Support non-power-of-two lengths and reuse the FFT.
      const freq = createReferenceFFTRealToReal(length)(input);

      const getXForFreqIndex = (index: number) => {
        let x;
        if (props.state[0].frequencyX === "log") {
          const base = 64;
          x = (Math.log2(1 + ((base - 1) * index) / freq.length) / Math.log2(base)) * width;
        } else {
          x = (index / freq.length) * width;
        }

        x = (x + (scroll.radius - scroll.center) * width) / (2 * scroll.radius);

        return x;
      };

      let max = 0;
      for (let i = 0; i < freq.length; i++) {
        max = Math.max(max, freq[i]);
      }

      // Draw marker and text for the interval and some harmonics.
      g.font = "0.75em sans-serif";
      g.fillStyle = "#000";
      g.textAlign = "left";
      g.textBaseline = "top";
      const interval = props.interval;
      if (interval) {
        g.beginPath();
        for (const t of [0.5, 1, 1.5, 2, 4, 8]) {
          const h = Math.round(interval * t);
          const x = getXForFreqIndex(freq.length / h);
          g.moveTo(x, 0);
          g.lineTo(x, height);

          // TODO: Skip labels when the lines are too close together.
          g.fillText(`${h}`, x + 2, 2);
        }
        g.strokeStyle = "#0008";
        g.stroke();
      }

      // Show the maximum value and X scale.
      g.textAlign = "right";
      g.fillText(`max = ${max.toFixed(3)}`, width - 2, 2);

      // Draw current series.
      g.beginPath();
      for (let i = 0; i < freq.length; i++) {
        const x = getXForFreqIndex(i);
        const y = (1 - freq[i] / max) * (height - 12) + 6;

        if (!i) g.moveTo(x, y);
        else g.lineTo(x, y);
      }

      g.strokeStyle = "#000";
      g.stroke();

      g.fillStyle = "#00F";
      g.fillRect((scroll.center - scroll.radius) * width, height - 3, 2 * scroll.radius * width, 3);
    } else {
      printError("internal error");
      return;
    }
  });

  const onWheel = (event: WheelEvent & { currentTarget: HTMLElement }) => {
    // TODO: Handle non-pixel-scale events.

    const mode = props.state[0].mode;

    const scroll = mode === "amplitude" ? getTimeShared() : getFreqShared();

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();

      let dx = clamp(event.deltaX, -256, 256);
      dx *= scroll.radius / 1024;

      const center = clamp(scroll.center + dx, scroll.radius, 1 - scroll.radius);

      (mode === "amplitude" ? setTimeShared : setFreqShared)({ center, radius: scroll.radius });
    } else {
      event.preventDefault();

      let dy = clamp(-event.deltaY, -256, 256);
      dy *= scroll.radius / 2048;

      // TODO: Scale minimum with actual number of samples.
      const radius = clamp(scroll.radius + dy, 0.001, 0.5);

      let center = scroll.center;
      const eventX = event.offsetX / event.currentTarget.offsetWidth;
      center += (scroll.radius - radius) * (2 * eventX - 1);
      center = clamp(center, radius, 1 - radius);

      (mode === "amplitude" ? setTimeShared : setFreqShared)({ center, radius });
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
          <Select
            options={names}
            getValue={() => props.state[0].inputName}
            setValue={(value) => props.state[1]("inputName", value)}
          />
        </>
      );
    }
  };

  return (
    <>
      <form class="hbox">
        <input
          type="checkbox"
          checked
          onChange={(event) => props.state[1]("showing", event.target.checked)}
        />
        <label>
          {"Show "}
          <Select
            options={["amplitude", "frequency"]}
            getValue={() => props.state[0].mode}
            setValue={(v) => props.state[1]("mode", v)}
          />
        </label>
        {inputSelector()}
        {props.state[0].mode === "frequency" && (
          <label>
            {"with X "}
            <Select
              options={["linear", "log"]}
              getValue={() => props.state[0].frequencyX}
              setValue={(v) => props.state[1]("frequencyX", v)}
            />
          </label>
        )}
      </form>
      {props.state[0].showing && (
        <canvas
          style="display:block;border:1px solid #000;width:100%;height:258px"
          ref={setCanvas}
          onWheel={onWheel}
        ></canvas>
      )}
    </>
  );
};

export interface FilterBlockState {
  mode:
    | "windowed sinc"
    | "truncated sinc"
    | "windowed sinc"
    | "truncated rrc"
    | "windowed rrc"
    | "truncated rrc twice"
    | "windowed rrc twice";
  interval: number;
  rolloff: number;
  radius: number;
  viewer: ViewerPaneState;
}

export const FilterBlock: Component<{
  state: StoreReturn<FilterBlockState>;
  input: Float32Array | undefined;
  setOutput: (value: Float32Array | undefined) => void;
}> = (props) => {
  /*  const [state, setState] = createStore({
    mode: "windowed sinc" as
      | "truncated sinc"
      | "windowed sinc"
      | "truncated rrc"
      | "windowed rrc"
      | "truncated rrc twice"
      | "windowed rrc twice",
    interval: 32,
    rolloff: 0.5,
    radius: 256,
  });*/

  const filters = {
    "truncated sinc": createSincFilter,
    "windowed sinc": createWindowedSincFilter,
    "truncated rrc": createRrcFilter,
    "windowed rrc": createWindowedRrcFilter,
    "truncated rrc twice": (options: RrcFilterOptions) => {
      const filter = createRrcFilter(options);
      return (input: Float32Array, output?: Float32Array<ArrayBuffer>) => {
        return filter(filter(input), output);
      };
    },
    "windowed rrc twice": (options: RrcFilterOptions) => {
      const filter = createWindowedRrcFilter(options);
      return (input: Float32Array, output?: Float32Array<ArrayBuffer>) => {
        return filter(filter(input), output);
      };
    },
  };

  const createFilter = () => {
    const { mode, interval, radius, rolloff } = props.state[0];
    return filters[mode]?.({ interval, rolloff, radius });
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
          : Apply {props.state[0].mode} with interval {props.state[0].interval}
        </span>
      </summary>
      <div class="vbox">
        <form class="hbox">
          <label>
            {"Apply "}
            <Select
              options={[
                "truncated sinc",
                "windowed sinc",
                "truncated rrc",
                "windowed rrc",
                "truncated rrc twice",
                "windowed rrc twice",
              ]}
              getValue={() => props.state[0].mode}
              setValue={(v) => props.state[1]("mode", v)}
            />
          </label>
          <label>
            {"with interval "}
            <input
              onChange={setValueAsNumberWhenValid(props.state[1], "interval")}
              type="number"
              value={props.state[0].interval}
              min="4"
              max="200"
              step="1"
              required
            />
          </label>
          {props.state[0].mode.match(/\brrc\b/) && (
            <label>
              {", rolloff"}{" "}
              <input
                onChange={setValueAsNumberWhenValid(props.state[1], "rolloff")}
                type="number"
                value={props.state[0].rolloff}
                min="0"
                max="1"
                step="0.05"
                required
              />
            </label>
          )}
          <label>
            {"and radius "}
            <input
              onChange={setValueAsNumberWhenValid(props.state[1], "radius")}
              type="number"
              value={props.state[0].radius}
              min="8"
              max="1024"
              step="1"
              required
            />
          </label>
        </form>
        <ViewerPane
          state={createStore(props.state[0].viewer)}
          inputs={{ output, filter: () => (createFilter() as any)?.coeffs }}
          interval={props.state[0].interval}
        />
      </div>
    </details>
  );
};
