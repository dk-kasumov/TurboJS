import {REACTIVE_INTERNAL, ReactiveState} from './state'

export type ReactiveComputed<T> = Omit<ReactiveState<T>, 'consumers' | 'set'>;

interface ComputedFunction<T> {
  (): T;
}

/**
 * Creates a computed reactive state that automatically updates when its dependencies change.
 * @template T The type of the computed value.
 * @param {ComputedFunction<T>} fn - The function used to compute the value.
 * @param {ReactiveComputed<unknown>[]} dependencies - The reactive states this computed value depends on.
 * @returns {ReactiveComputed<T>} A callable reactive state representing the computed value.
 *
 * @example <caption>Basic Usage</caption>
 * const firstName = $state('Davyd');
 * const lastName = $state('Kasumov');
 *
 * const fullName = $computed(
 *   () => `${firstName()} ${lastName()}`,
 *   [firstName, lastName]
 * );
 *
 * console.log(fullName()); // Logs: "Davyd Kasumov"
 *
 * firstName.set('Alex'); // Updates firstName and triggers fullName re-computation.
 *
 * console.log(fullName()); // Logs: "Alex Kasumov"
 */
export const $computed = <T>(
  fn: ComputedFunction<T>,
  dependencies: ReactiveState<unknown>[]
): ReactiveComputed<T> => {
  const callable: ReactiveComputed<T> = () => callable.value

  callable.value = fn();
  callable.type = REACTIVE_INTERNAL;

  const recalculate = () => (callable.value = fn())

  dependencies.forEach(ref =>
    ref.type === REACTIVE_INTERNAL && ref.consumers.push(recalculate)
  )

  return callable;
};
