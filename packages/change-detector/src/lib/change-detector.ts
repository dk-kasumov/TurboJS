export interface ChangeDetectorNode {
  type: 'mustache'
  var: HTMLElement
  stateRef: () => unknown
  state: unknown
}

export interface ChangeDetector {
  nodes: ChangeDetectorNode[]

  add(node: ChangeDetectorNode): void

  update(node: ChangeDetectorNode, value: any): Promise<void>

  check(): void
}

/**
 * ###### INTERNAL
 * Creates a change detector for reactive nodes.
 *
 * @returns {ChangeDetector} The change detector object.
 *
 * @example
 * const name = $state('Davyd')
 * const cd = $changeDetector();
 *
 * const node = {
 *   type: 'mustache',
 *   var: document.querySelector('.text'),
 *   stateRef: name,
 *   state: name(),
 * };
 *
 * changeDetector.add(node);
 *
 * // Somewhere in the app:
 * state.set('new value');
 *
 * changeDetector.check(); // Automatically updates nodes with the new value.
 */
export const $changeDetector = (): ChangeDetector => {
  return {
    nodes: [],
    add(node) {
      this.nodes.push(node)
    },
    async update(node, value) {
      if (node.type === 'mustache') {
        node.var.textContent = node.stateRef() as string
        node.state = value
      }
    },
    check() {
      for (const node of this.nodes) {
        const value = node.stateRef()

        if (node.state !== value) {
          void this.update(node, value)
        }
      }
    }
  }
}
