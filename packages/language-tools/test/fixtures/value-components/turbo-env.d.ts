/// <reference path="../../../lib/turbo.d.ts" />

declare function signal<T>(value: T): { (): T; set(value: T): void };
declare function memo<T>(fn: () => T): () => T;
