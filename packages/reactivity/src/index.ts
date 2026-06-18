import {Accessor, Callback, Reaction, WritableSignal} from './types'

let activeReaction: Reaction | null = null;

function unsubscribe(r: Reaction) {
  for (const dep of r.deps) {
    dep.delete(r);
  }

  r.deps.clear();

  for (const cleanup of r.cleanups) {
    cleanup();
  }

  r.cleanups.length = 0;
}

export function signal<T>(initial: T) {
  let value = initial;
  const observers = new Set<Reaction>();

  const read = () => {
    if (activeReaction) {
      observers.add(activeReaction);
      activeReaction.deps.add(observers);
    }

    return value;
  }

  read.set = (next: T) => {
    if (Object.is(next, value)) return;
    value = next;

    for (const observer of [...observers]) {
      observer.run();
    }
  };

  return read as WritableSignal<T>;
}

export function effect(fn: Callback): Callback {
  const reaction = Reaction.from();
  reaction.run = () => {
    unsubscribe(reaction);
    const prev = activeReaction;
    activeReaction = reaction;

    try {
      fn();
    } finally {
      activeReaction = prev;
    }
  };

  reaction.run();

  return () => unsubscribe(reaction);
}

export function memo<T>(fn: () => T): Accessor<T> {
  const s = signal<T>(undefined as T);
  effect(() => s.set(fn()));
  return () => s();
}

export function untrack<T>(fn: () => T): T {
  const prev = activeReaction;
  activeReaction = null;
  
  try {
    return fn();
  } finally {
    activeReaction = prev;
  }
}

export function onCleanup(fn: () => void): void {
  if (activeReaction) activeReaction.cleanups.push(fn);
}
