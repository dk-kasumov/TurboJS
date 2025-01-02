import {HTML_AST} from '@turbo/parser'

export type Visitor = {
  [key in 'Element' | 'Attribute' | 'Text' | 'MustacheTag' | 'AttributeBinding' | 'EventHandler' | 'Directive']: {
    enter: (node: HTML_AST) => void
    leave: (node: HTML_AST) => void
  }
}
