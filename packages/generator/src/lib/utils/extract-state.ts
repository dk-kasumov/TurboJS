import {ModuleDeclaration, Statement} from 'acorn'

export const extractState = (body: (Statement | ModuleDeclaration)[]) => {
  const reactiveStates = []
  const variableDeclarations = body.filter(el => el.type === 'VariableDeclaration')

  for (let item of variableDeclarations) {
    for (let declaration of item.declarations) {
      if (declaration.init!.type !== 'CallExpression') continue

      if ((declaration.init.callee as any).name === '$state') {
        reactiveStates.push((declaration.id as any).name)
        continue
      }

      if ((declaration.init.callee as any).name === '$props') {
        if ('properties' in declaration.id) {
          declaration.id.properties.forEach(el => reactiveStates.push((el as any).key.name))
        }
      }
    }
  }

  return reactiveStates
}

export const injectWatcher = (body: (Statement | ModuleDeclaration)[]) => {
  return `
            $effect(() => {
                $that.$changeDetector.check();
            }, [${extractState(body)}])
        `
}
