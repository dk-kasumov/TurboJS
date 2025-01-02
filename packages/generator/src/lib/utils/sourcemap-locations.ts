import {walk} from "estree-walker";

export function addSourcemapLocations(node, code) {
    walk(node, {
        enter(node) {
            code.addSourcemapLocation(node.start);
            code.addSourcemapLocation(node.end);
        }
    });
}
