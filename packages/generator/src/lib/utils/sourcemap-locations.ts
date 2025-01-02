import {Node, walk} from 'estree-walker'
import MagicString from 'magic-string'
import {Program} from 'acorn'

export const addSourcemapLocations = (node: Program, code: MagicString) => {
    walk(node as Node, {
        enter(node) {
            code.addSourcemapLocation((node as any).start);
            code.addSourcemapLocation((node as any).end);
        }
    });
}
