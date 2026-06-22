import Header from "./Header";
import Counter from "./Counter";
import { signal, memo } from "@turbo/reactivity";

const title = signal("turbo counters");
const show = signal(true);

const Boxed = () => <div class="boxed">case 3 — thunk value-component</div>;
const Computed = memo(() =>
  show() ? <Header title="case 2 — memo component" /> : <Boxed />,
);
const Dynamic = signal<JSX.Element>(<em>case 4 — initial signal JSX</em>);

export default (
  <div class="app">
    <Header title={title()} />
    <Counter />
    <Counter />
    <button onClick={() => title.set("turbo counters clicked!")}>click</button>

    <hr />

    <button data-testid="toggle" onClick={() => show.set(!show())}>
      toggle
    </button>

    <div data-testid="conditional">
      {show() ? <Header title="case 1 — conditional branch" /> : <Boxed />}
    </div>

    <Computed />
    <Boxed />

    <div data-testid="dynamic">
      <Dynamic />
    </div>
    <button
      data-testid="set-dynamic"
      onClick={() => Dynamic.set(<strong>case 4 — updated signal JSX</strong>)}
    >
      set dynamic
    </button>
  </div>
);
