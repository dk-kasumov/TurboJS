import {readExpression} from '../read/expression.js'
import {Parser} from '../@models/parser.model'

export const mustache = (parser: Parser) => {
  const start = parser.index
  parser.index += 2
  parser.allowWhitespace()

  const expression = readExpression(parser)!
  parser.allowWhitespace()
  parser.eat('}}', true)

  parser.current().children!.push({
    start,
    end: parser.index,
    type: 'MustacheTag',
    expression
  })
}
