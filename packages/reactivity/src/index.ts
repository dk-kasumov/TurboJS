import { brand, isAccessor } from "./accessor";
import { Accessor, Callback, Reaction, Source, WritableSignal } from "./types";

export { isAccessor };

let activeReaction: Reaction | null = null;
let activeOwner: Reaction | null = null;

let batchDepth = 0;
let flushing = false;
const queue = new Set<Reaction>();

function propagate(observers: Source): void {
  for (const observer of observers) observer.notify();
}

function flush(): void {
  if (flushing) return;
  flushing = true;

  try {
    while (queue.size > 0) {
      const pending = [...queue];
      queue.clear();
      for (const reaction of pending) reaction.run();
    }
  } finally {
    flushing = false;
  }
}

export function batch<T>(fn: () => T): T {
  batchDepth++;

  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flush();
  }
}

function dispose(reaction: Reaction): void {
  for (const child of reaction.owned) dispose(child);
  reaction.owned.length = 0;

  for (const source of reaction.deps) source.delete(reaction);
  reaction.deps.clear();

  for (const cleanup of reaction.cleanups) cleanup();
  reaction.cleanups.length = 0;
}

function adopt(reaction: Reaction): void {
  reaction.owner = activeOwner;
  activeOwner?.owned.push(reaction);
}

function detach(reaction: Reaction): void {
  const owned = reaction.owner?.owned;
  if (!owned) return;
  const index = owned.indexOf(reaction);
  if (index >= 0) owned.splice(index, 1);
}

function runWith<T>(
  reaction: Reaction | null,
  owner: Reaction | null,
  fn: () => T,
): T {
  const prevReaction = activeReaction;
  const prevOwner = activeOwner;
  activeReaction = reaction;
  activeOwner = owner;

  try {
    return fn();
  } finally {
    activeReaction = prevReaction;
    activeOwner = prevOwner;
  }
}

function observe(source: Source): void {
  if (!activeReaction) return;
  source.add(activeReaction);
  activeReaction.deps.add(source);
}

export function signal<T>(initial: T): WritableSignal<T> {
  let value = initial;
  const observers: Source = new Set();

  const read = () => {
    observe(observers);
    return value;
  };

  read.set = (next: T) => {
    if (Object.is(next, value)) return;
    value = next;
    propagate(observers);
    if (batchDepth === 0) flush();
  };

  brand(read);
  return read as WritableSignal<T>;
}

export function effect(fn: Callback): Callback {
  const reaction = new Reaction();
  adopt(reaction);

  reaction.run = () => {
    dispose(reaction);
    runWith(reaction, reaction, fn);
  };

  reaction.notify = () => {
    queue.add(reaction);
  };

  reaction.run();

  return () => {
    dispose(reaction);
    detach(reaction);
  };
}

export function memo<T>(fn: () => T): Accessor<T> {
  const reaction = new Reaction();
  adopt(reaction);

  const observers: Source = new Set();
  let value: T;
  let stale = true;

  reaction.notify = () => {
    if (stale) return;
    stale = true;
    propagate(observers);
  };

  const read = () => {
    observe(observers);
    if (stale) {
      dispose(reaction);
      value = runWith(reaction, reaction, fn);
      stale = false;
    }
    return value;
  };

  brand(read);
  return read;
}

export function createRoot<T>(fn: (dispose: Callback) => T): T {
  const root = new Reaction();
  adopt(root);

  return runWith(null, root, () =>
    fn(() => {
      dispose(root);
      detach(root);
    }),
  );
}

export function untrack<T>(fn: () => T): T {
  return runWith(null, activeOwner, fn);
}

export function onCleanup(fn: Callback): void {
  if (activeOwner) activeOwner.cleanups.push(fn);
}
