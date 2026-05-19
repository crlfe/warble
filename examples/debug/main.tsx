import { createSignal } from "solid-js";
import { render } from "solid-js/web";

import licenses from "../licenses.txt?raw";
import { FilterBlock, SourceBlock } from "./blocks";

const main = () => {
  const [getData0, setData0] = createSignal<Float32Array>();
  const [_getData1, setData1] = createSignal<Float32Array>();

  return (
    <div class="vbox">
      <SourceBlock setOutput={setData0} />
      <FilterBlock input={getData0()} setOutput={setData1} />
      <details>
        <summary>Licenses</summary>
        <pre>{licenses}</pre>
      </details>
    </div>
  );
};

render(main, document.body);
