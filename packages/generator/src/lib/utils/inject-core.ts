import deindent from "deindent";

export const injectCore = (current) => {
    return deindent`
        import {$state, $effect, $computed} from '../compiler/reactive/state'
        import {$changeDetector} from '../compiler/change-detector/change-detector'
    `
}
