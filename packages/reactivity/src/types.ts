export interface Accessor<T> {
  (): T;
}

export interface WritableSignal<T> extends Accessor<T> {
  set(value: T): void;
}

export interface Callback {
  (): void;
}

export type Source = Set<Reaction>;

export class Reaction {
  run: Callback = () => {};
  notify: Callback = () => {};
  readonly deps = new Set<Source>();
  readonly cleanups: Callback[] = [];
  owner: Reaction | null = null;
  readonly owned: Reaction[] = [];
}
