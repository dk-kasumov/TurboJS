import Header from "./Header";
import Counter from "./Counter";
import { signal } from "@turbo/reactivity";

const title = signal("turbo counters");

export default (
  <div class="app">
    <Header title={title()} />
    <Counter />
    <Counter />
    <button onClick={() => title.set("turbo counters clicked!")}>click</button>
  </div>
);

