import MagicString from 'magic-string'
import {counter} from './utils/counter.js'
import {walkHtml} from './utils/walk-html.js'
import deindent from 'deindent'
import {addSourcemapLocations} from './utils/sourcemap-locations.js'
import {bootstrapApp, createComponent} from './component/create-component.js'
import {injectCore} from './utils/inject-core.js'
import {injectWatcher} from './utils/extract-state.js'
import {extractImports} from './utils/extract-imports.js'
import {serializeObject} from './utils/serialize.js'
import {HTML_AST, ParseResult} from '@turbo/parser'
import {GeneratorStack} from './@models/generator.model'

export const generate = (parsed: ParseResult, template: string, isEntryPoint: boolean): Record<'code', string> => {
  const code = new MagicString(template)

  let current: GeneratorStack = {
    initCode: [] as string[],
    components: [],
    componentBindings: [],
    importStatements: [],
    componentScripts: '',
    target: 'target',
    isEntryPoint,
    stack: [],
    render: [],
    counter: counter()
  }

  if (parsed.css) {
    const name = current.counter('styleTag')

    current.initCode.push(deindent`
            const head = document.head || document.getElementsByTagName('head')[0];
            const ${name} = document.createElement('style');
            ${name}.textContent = ${JSON.stringify(parsed.css.content.styles)};
            head.appendChild(${name});
    `)
  }

  if (parsed.js) {
    const content = parsed.js.content

    addSourcemapLocations(content, code)

    const {imports, components} = extractImports(content.body, code)

    current.importStatements = imports
    current.components = components

    current.componentScripts += code.slice(content.start, content.end)
    current.componentScripts += injectWatcher(content.body)
  }

  walkHtml(parsed.html, {
    Element: {
      enter(node) {
        const isComponent = current.components.some(el => el === node.name)

        if (isComponent) return

        const name = current.counter(node.name!)
        const element = `const ${name} = document.createElement('${node.name}')`

        current.render.push(element)
        current.stack.push(name)
      },
      leave(node) {
        const isComponent = current.components.some(el => el === node.name)

        if (isComponent) {
          const name = `$$${node.name}`
          const parentNode = current.stack[current.stack.length - 1] ?? 'target'

          const props = current.componentBindings.reduce((acc, el) => {
            ;(acc as any)[el.name] = el.value
            return acc
          }, {})

          const element = `const ${name} = ${node.name}({target: ${parentNode}, _props: ${serializeObject(props)} })`
          current.render.push(element, `console.log(${name})`)
          return
        }

        const currentNode = current.stack.pop()
        const parentNode = current.stack[current.stack.length - 1] ?? 'target'

        const append = `${parentNode}.appendChild(${currentNode})`
        current.render.push(append)
      }
    },
    Attribute: {
      enter(node) {},
      leave() {}
    },
    EventHandler: {
      enter(node) {
        const parent = current.stack[current.stack.length - 1]
        const expression = code.slice(node.expression!.start, node.expression!.end)

        const append = `${parent}.addEventListener("${node.name}", () => {
                    ${expression}
                })`

        current.render.push(append)
      },
      leave() {}
    },
    AttributeBinding: {
      enter(node) {
        const isComponent = current.components.some(el => el === node.tagName)

        if (!isComponent) return

        current.componentBindings.push({
          name: node.name!,
          value: code.slice((node.value as HTML_AST).start, (node.value as HTML_AST).end!)
        })
      },
      leave() {}
    },
    Text: {
      enter(node) {
        const parentNode = current.stack[current.stack.length - 1] ?? 'target'
        const append = `${parentNode}.appendChild(document.createTextNode(${JSON.stringify(node.data)}))`

        current.render.push(append)
      },
      leave() {}
    },
    MustacheTag: {
      enter(node) {
        const currentNode = current.stack[current.stack.length - 1]
        const name = current.counter('mustache')
        const expression = code.slice(node.expression!.start, node.expression!.end)
        const callee =
          (node.expression!.type === 'CallExpression' && (node.expression.callee as any).name) || `() => ${expression}`

        const mustache = `const ${name} = document.createTextNode(${expression})`
        const watcher = `$that.$changeDetector.add({ type: 'mustache', var: ${name}, state: ${expression}, stateRef: ${callee} })`
        const append = `${currentNode}.appendChild(${name})`

        current.render.push(mustache, watcher, append)
      },
      leave() {}
    }
  })

  const result = deindent`    
        ${injectCore()}
        ${current.importStatements.join('\n')}
    
        ${createComponent(current)}
        
        ${bootstrapApp(current)}
    `

  return {code: result}
}
