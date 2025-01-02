import {HTML_AST} from '@turbo/parser'
import {Visitor} from '../@models/walk.model'

export const walkHtml = (html: HTML_AST, visitors: Visitor) => {
  const visit = (node: HTML_AST) => {
    const visitor = (visitors as any)[node.type]

    if (!visitor) throw new Error(`Not implemented: ${node.type}`)

    if (visitor.enter) visitor.enter(node)

    if (node.attributes) {
      node.attributes.forEach(child => visit(child))
    }

    if (node.children) {
      node.children.forEach(child => visit(child))
    }

    if (visitor.leave) visitor.leave(node)
  }

  html.children?.forEach(node => visit(node))
}
