export const extractImports = (body, code) => {
    const importDeclarations = body.filter(el => el.type === 'ImportDeclaration')
    const importCode = importDeclarations.map(el => code.slice(el.start, el.end))
    importDeclarations.forEach(el => code.overwrite(el.start, el.end, ''))

    const components = importDeclarations.reduce((acc, el) => {
        if (!el.source.value.endsWith('.turbo')) return acc;

        for (const item of el.specifiers) {
            acc.push(item.local.name)
        }

        return acc;
    }, [])

    return {imports: importCode, components}
}
