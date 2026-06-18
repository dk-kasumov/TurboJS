import { memo, signal } from "@turbo/reactivity";

const count = signal(0);
const double = memo(() => count() * 2);

export default (
  <div class="counter">
    <span data-testid="count">{count()}</span>
    <span data-testid="double">{double()}</span>
    <button data-testid="inc" onClick={() => count.set(count() + 1)}>
      +
    </button>
  </div>
);
