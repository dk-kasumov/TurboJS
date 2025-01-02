import {parseExpressionAt, Expression} from 'acorn'
import {AcornError, Parser} from '../@models/parser.model'

export const readExpression = (parser: Parser): Expression | void => {
  try {
    const node = parseExpressionAt(parser.template, parser.index, {ecmaVersion: 8})
    parser.index = node.end
    return node
  } catch (err) {
    parser.acornError(err as AcornError)
  }
}
