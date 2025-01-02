import deindent from "deindent";
import {GeneratorStack} from '../@models/generator.model'

export const bootstrapApp = (current: GeneratorStack) => {
    if (!current.isEntryPoint) return;

    return deindent`
        window.addEventListener("load", () => {
            const _$app = document.querySelector('div#app')
            new CreateComponent({target: _$app})
        });
    `
}


export const createComponent = (current: GeneratorStack) => {
    return deindent`
        function CreateComponent({ target, _props = {} }) {
            const $that = CreateComponent;
            $that.$changeDetector = $changeDetector();
            
            const $props = () => _props
            
            const $onInit = function(fn) {
                $that.$onInit = fn;
            }
            
            const $afterContentInit = function(fn) {
                $that.$afterContentInit = fn;
            }
            
            ${current.initCode.join('\n')}
        
            ${current.componentScripts}
            
            $that?.$onInit?.()
        
            ${current.render.join('\n')}
            
            $that?.$afterContentInit?.()
            
            return {}
        }
        
        ${current.isEntryPoint ? '' : 'export default CreateComponent'}
    `
}
