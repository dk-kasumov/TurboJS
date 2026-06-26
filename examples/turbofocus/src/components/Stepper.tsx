import { input, output } from "@turbo/core";

const label = input.required<string>();
const value = input.required<number>();
const min = input(1);
const change = output<number>();

export default (
  <div class="stepper">
    <span class="stepper-label">{label()}</span>
    <button class="round" onClick={() => change.emit(Math.max(min(), value() - 1))}>
      −
    </button>
    <span class="stepper-value">{value()}</span>
    <button class="round" onClick={() => change.emit(value() + 1)}>+</button>
  </div>
);
