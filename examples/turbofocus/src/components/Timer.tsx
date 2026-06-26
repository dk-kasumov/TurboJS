import { effect } from "@turbo/reactivity";
import { onDestroy } from "@turbo/core";
import { store } from "../store";
import ProgressBar from "./ProgressBar";

effect(() => {
  if (!store.running()) return;
  const id = setInterval(() => store.tick(), 1000);
  onDestroy(() => clearInterval(id));
});

export default (
  <section class="timer">
    <div class="timer-mode">{store.label(store.mode())}</div>
    <div class="clock" test-id="clock">{store.clock()}</div>
    <ProgressBar percent={store.progress()} />
    <div class="actions">
      {store.running() ? (
        <button class="btn" test-id="toggle" onClick={() => store.pause()}>
          Pause
        </button>
      ) : (
        <button class="btn primary" test-id="toggle" onClick={() => store.start()}>
          Start
        </button>
      )}
      <button class="btn" onClick={() => store.reset()} disabled={store.isPristine()}>
        Reset
      </button>
    </div>
  </section>
);
