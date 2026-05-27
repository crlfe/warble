import { createEffect, createSignal, ErrorBoundary } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";

import licenses from "../licenses.txt?raw";
import {
  FilterBlock,
  type FilterBlockState,
  getDefaultViewerPaneState,
  SourceBlock,
  type SourceBlockState,
} from "./blocks";

interface MainState {
  source: SourceBlockState;
  filter: FilterBlockState;
}

const createMainState = (): MainState => ({
  source: {
    mode: "symbols",
    amplitude: 1.0,
    interval: 32,
    viewer: getDefaultViewerPaneState(),
  } satisfies SourceBlockState,
  filter: {
    mode: "windowed sinc",
    interval: 32,
    rolloff: 0.5,
    radius: 256,
    viewer: getDefaultViewerPaneState(),
  } satisfies FilterBlockState,
});

const main = () => {
  const sessionStorageKey = "warble-examples-debug";

  const [state, setState] = createStore<MainState>(
    JSON.parse(sessionStorage.getItem(sessionStorageKey) ?? "null") ?? createMainState(),
  );
  createEffect(() => {
    sessionStorage.setItem(sessionStorageKey, JSON.stringify(state));
  });

  const [getData0, setData0] = createSignal<Float32Array>();
  const [_getData1, setData1] = createSignal<Float32Array>();

  return (
    <div class="vbox">
      <div class="hbox">
        <button
          onClick={() => {
            setState(createMainState());
            location.reload();
          }}
        >
          Reset
        </button>
      </div>
      <ErrorBoundary fallback={(error) => <pre>${error.stack}</pre>}>
        <SourceBlock state={createStore(state.source)} setOutput={setData0} />
        <FilterBlock state={createStore(state.filter)} input={getData0()} setOutput={setData1} />
      </ErrorBoundary>
      <details>
        <summary>Licenses</summary>
        <pre>{licenses}</pre>
      </details>
    </div>
  );
};

render(main, document.body);
