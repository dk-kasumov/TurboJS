import { memo, signal } from "@turbo/reactivity";

const count = signal(0);

export default (
  <div class="counter">
    <span data-testid="count">{count()}</span>
    <button data-testid="inc" onClick={() => count.set(count() + 1)}>
      +
    </button>
  </div>
);
