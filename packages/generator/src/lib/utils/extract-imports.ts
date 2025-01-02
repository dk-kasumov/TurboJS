import {ModuleDeclaration, Statement} from 'acorn'
import MagicString from 'magic-string'

export const extractImports = (body: (Statement | ModuleDeclaration)[], code: MagicString) => {
    const importDeclarations = body.filter(el => el.type === 'ImportDeclaration')
    const importCode = importDeclarations.map(el => code.slice(el.start, el.end))
    importDeclarations.forEach(el => code.overwrite(el.start, el.end, ''))

    const components = importDeclarations.reduce((acc, el) => {
        if (!String(el.source!.value!).endsWith('.turbo')) return acc;

        for (const item of el.specifiers) {
            acc.push(item.local!.name)
        }

        return acc;
    }, [] as string[])

    return {imports: importCode, components}
}
