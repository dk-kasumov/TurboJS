import {REACTIVE_INTERNAL, ReactiveState} from './state'

export type EffectFunction = () => void

/**
 * Creates a reactive effect that runs a function whenever one of its dependencies changes.
 * @param {EffectFunction} fn - The effect function to execute.
 * @param {ReactiveState<unknown>[]} dependencies - The reactive states this effect depends on.
 *
 * @example <caption>Basic Usage</caption>
 * const count = $state(0);
 *
 * $effect(() => {
 *   console.log(`Count is: ${count()}`); // Initial call | Logs: "Count is: 0"
 * }, [count]);
 *
 * count.set(1); // Logs: "Count is: 1"
 * count.set(2); // Logs: "Count is: 2"
 */
export const $effect = (fn: EffectFunction, dependencies: ReactiveState<unknown>[]): void => {
  fn()

  dependencies.forEach(ref => ref.type === REACTIVE_INTERNAL && ref.consumers.push(fn))
}
