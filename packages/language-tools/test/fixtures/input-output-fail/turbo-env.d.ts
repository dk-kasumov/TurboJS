/// <reference path="../../../lib/turbo.d.ts" />

declare function input<T>(initial: T): { (): T };
declare namespace input {
  function required<T>(): { (): T };
}
declare function output<T = void>(): { emit(value: T): void };
