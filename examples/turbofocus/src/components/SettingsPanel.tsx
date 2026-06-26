import Stepper from "./Stepper";
import { MODES, store } from "../store";

export default (
  <section class="panel">
    <h2>Durations</h2>
    {MODES.map((m) => (
      <Stepper
        label={m.label}
        value={store.minutesOf(m.id)()}
        change={(mins) => store.setMinutes(m.id, mins)}
      />
    ))}
  </section>
);
