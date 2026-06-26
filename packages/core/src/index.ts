import { memo } from "@turbo/reactivity";

export { onCleanup as onDestroy } from "@turbo/reactivity";

export interface InputSignal<T> {
  (): T;
}

export interface OutputEmitter<T> {
  emit(value: T): void;
}

type Props = Record<string, unknown>;

const UNCOMPILED =
  "turbo: input()/output() are compile-time markers — run the turbo compiler";

export function input<T>(initial: T): InputSignal<T>;
export function input<T>(): InputSignal<T | undefined>;
export function input(): InputSignal<unknown> {
  throw new Error(UNCOMPILED);
}

export namespace input {
  export function required<T>(): InputSignal<T> {
    throw new Error(UNCOMPILED);
  }
}

export function output<T = void>(): OutputEmitter<T> {
  throw new Error(UNCOMPILED);
}

export function _$input<T>(props: Props, key: string, initial: T): InputSignal<T> {
  return memo(() => {
    const value = props[key];
    return value === undefined ? initial : (value as T);
  });
}

export function _$inputRequired<T>(props: Props, key: string): InputSignal<T> {
  return memo(() => props[key] as T);
}

export function _$output<T>(props: Props, key: string): OutputEmitter<T> {
  return {
    emit(value) {
      const handler = props[key];
      if (typeof handler === "function") handler(value);
    },
  };
}
