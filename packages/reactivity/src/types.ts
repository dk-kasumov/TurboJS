export interface Accessor<T> {
  (): T;
}

export interface WritableSignal<T> extends Accessor<T> {
  set(value: T): void;
}

export class Reaction {
  constructor(
    public run: () => void,
    public deps: Set<Set<Reaction>>,
    public cleanups: Array<() => void>
  ) {}

  static from() {
    return new Reaction(() => {}, new Set(), []);
  }
}

export interface Callback {
  (): void;
}