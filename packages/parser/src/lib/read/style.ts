import {HTML_AST, Parser, STYLE_AST} from '../@models/parser.model'

export const readStyle = (parser: Parser, start: number, attributes: HTML_AST[]): STYLE_AST => {
  const contentStart = parser.index
  const styles = parser.readUntil(/<\/style>/)
  const contentEnd = parser.index

  parser.eat('</style>', true)
  const end = parser.index

  return {
    start,
    end,
    attributes,
    content: {
      start: contentStart,
      end: contentEnd,
      styles
    }
  }
}
