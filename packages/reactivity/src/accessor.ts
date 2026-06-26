import { Accessor } from "./types";

const ACCESSOR = Symbol("turbo.accessor");

export function brand<T extends object>(value: T): T {
  Object.defineProperty(value, ACCESSOR, { value: true });
  return value;
}

export function isAccessor(value: unknown): value is Accessor<unknown> {
  return typeof value === "function" && ACCESSOR in value;
}
