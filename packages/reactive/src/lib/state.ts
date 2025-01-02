export const REACTIVE_INTERNAL = Symbol('REACTIVE_INTERNAL')

export interface ReactiveStateOptions {
  skipMemo: boolean
}

export interface ReactiveState<T> {
  value: T
  type: Symbol

  (): T

  consumers: Array<() => void>
  set: (newValue: T) => void
}

/**
 * Creates a reactive state object.
 * @template T The type of the state value.
 * @param {T} value - The initial value of the state.
 * @param {Object} [options] - Optional settings for the state.
 * @param {boolean} [options.skipMemo=false] - Whether to skip memoization checks when setting a new value.
 * @returns {ReactiveState<T>} A reactive state object.
 *
 * @example <caption>Basic Usage</caption>
 * const name = $state('Davyd');
 *
 * $effect(() => {
 *   console.log(name()); // Logs: "Davyd"
 * }, [name]);
 *
 * name.set('Alex'); // Updates the state and triggers the effect
 *
 * @example <caption>Using with Objects</caption>
 * const user = $state({ name: 'Davyd', age: 20 });
 *
 * $effect(() => {
 *   console.log(user().name); // Logs: "Davyd"
 * }, [user]);
 *
 * user.set({ name: 'Alex', age: 21 }); // Updates the state and triggers the effect
 */
export const $state = <T>(value: T, options: ReactiveStateOptions = {skipMemo: false}): ReactiveState<T> => {
  const callable: ReactiveState<T> = () => callable.value

  callable.value = value
  callable.consumers = []
  callable.type = REACTIVE_INTERNAL

  callable.set = (newValue: T) => {
    if (!options.skipMemo && callable.value === newValue) {
      return
    }

    callable.value = newValue
    callable.consumers.forEach(fn => fn())
  }

  return callable
}
