export const extractState = (body) => {
    const reactiveStates = [];
    const variableDeclarations = body.filter(el => el.type === 'VariableDeclaration')

    for (let item of variableDeclarations) {
        for (let declaration of item.declarations) {
            if (declaration.init.type !== 'CallExpression') continue;

            if (declaration.init.callee.name === '$state') {
                reactiveStates.push(declaration.id.name);
                continue;
            }

            if (declaration.init.callee.name === '$props') {
                declaration.id.properties.forEach(el => reactiveStates.push(el.key.name))
            }
        }
    }

    return reactiveStates
}

export const injectWatcher = (body) => {
    return `
            $effect(() => {
                $that.$changeDetector.check();
            }, [${extractState(body)}])
        `
}
