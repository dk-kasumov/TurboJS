import { signal, memo } from "@turbo/reactivity";

export type Mode = "focus" | "shortBreak" | "longBreak";

export interface Session {
  id: number;
  mode: Mode;
  minutes: number;
}

export const MODES: { id: Mode; label: string }[] = [
  { id: "focus", label: "Focus" },
  { id: "shortBreak", label: "Short Break" },
  { id: "longBreak", label: "Long Break" },
];

const pad = (n: number) => String(n).padStart(2, "0");

class FocusStore {
  readonly mode = signal<Mode>("focus");
  readonly running = signal(false);
  readonly history = signal<Session[]>([]);

  private readonly minutes = {
    focus: signal(25),
    shortBreak: signal(5),
    longBreak: signal(15),
  };

  readonly secondsTotal = memo(() => this.minutesOf(this.mode())() * 60);
  readonly secondsLeft = signal(this.minutes.focus() * 60);

  readonly clock = memo(
    () =>
      `${pad(Math.floor(this.secondsLeft() / 60))}:${pad(this.secondsLeft() % 60)}`,
  );

  readonly progress = memo(() =>
    this.secondsTotal()
      ? Math.round((1 - this.secondsLeft() / this.secondsTotal()) * 100)
      : 0,
  );

  readonly isPristine = memo(() => this.secondsLeft() === this.secondsTotal());

  readonly focusCount = memo(
    () => this.history().filter((s) => s.mode === "focus").length,
  );
  
  readonly minutesLogged = memo(
    () => this.history().reduce((total, s) => total + s.minutes, 0),
  );

  private nextId = 1;

  minutesOf(mode: Mode) {
    return this.minutes[mode];
  }

  label(mode: Mode) {
    return MODES.find((m) => m.id === mode)!.label;
  }

  start() {
    this.running.set(true);
  }

  pause() {
    this.running.set(false);
  }

  reset() {
    this.running.set(false);
    this.secondsLeft.set(this.secondsTotal());
  }

  tick() {
    if (this.secondsLeft() > 1) {
      this.secondsLeft.set(this.secondsLeft() - 1);
      return;
    }
    this.log(this.mode(), this.minutesOf(this.mode())());
    this.reset();
  }

  switchMode(mode: Mode) {
    this.mode.set(mode);
    this.reset();
  }

  setMinutes(mode: Mode, minutes: number) {
    this.minutesOf(mode).set(minutes);
    if (mode === this.mode()) this.reset();
  }

  private log(mode: Mode, minutes: number) {
    this.history.set([{ id: this.nextId++, mode, minutes }, ...this.history()]);
  }
}

export const store = new FocusStore();
