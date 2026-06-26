import { store } from "../store";

export default (
  <section class="panel">
    <h2>Sessions</h2>
    {store.history().length === 0 ? (
      <p class="muted">No sessions yet — finish a timer to log one.</p>
    ) : (
      <ul class="sessions">
        {store.history().map((s) => (
          <li class="session">
            <span>{store.label(s.mode)}</span>
            <span class="muted">{s.minutes} min</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);
