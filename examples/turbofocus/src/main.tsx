import ModeTabs from "./components/ModeTabs";
import Timer from "./components/Timer";
import SettingsPanel from "./components/SettingsPanel";
import SessionHistory from "./components/SessionHistory";
import { store } from "./store";

const tagline = <p class="muted">A compiler-first Pomodoro timer.</p>;

export default (
  <div class={store.mode() === "focus" ? "app focus" : "app rest"}>
    <header class="hero">
      <h1>TurboFocus</h1>
      {tagline}
    </header>

    <ModeTabs />
    <Timer />

    <div class="stats">
      <div class="stat">
        <strong test-id="focus-count">{store.focusCount()}</strong>
        <span class="muted">focus done</span>
      </div>
      <div class="stat">
        <strong>{store.minutesLogged()}</strong>
        <span class="muted">minutes logged</span>
      </div>
    </div>

    <SettingsPanel />
    <SessionHistory />
  </div>
);
