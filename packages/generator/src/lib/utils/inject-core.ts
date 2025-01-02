import deindent from "deindent";

export const injectCore = () => {
    return deindent`
        import {$state, $effect, $computed} from '@turbo/reactive'
        import {$changeDetector} from '@turbo/change-detector'
    `
}
