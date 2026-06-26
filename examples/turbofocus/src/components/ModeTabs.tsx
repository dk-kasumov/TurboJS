import { MODES, store } from "../store";

export default (
  <div class="tabs">
    {MODES.map((tab) => (
      <button
        class={store.mode() === tab.id ? "tab active" : "tab"}
        onClick={() => store.switchMode(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
