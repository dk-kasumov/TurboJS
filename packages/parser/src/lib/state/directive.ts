import {parseExpressionAt} from 'acorn'
import {HTML_AST, Parser} from '../@models/parser.model'

export const readAttribute = (parser: Parser): HTML_AST | null => {
  const start = parser.index

  let name = parser.readUntil(/(\s|=|\/|>)/)
  if (!name) return null

  parser.allowWhitespace()

  if (/^on:/.test(name)) {
    parser.eat('=', true)

    return readEventHandlerDirective(parser, name.slice(3))
  }

  if (/^bind:/.test(name)) {
    parser.eat('=')
    const [value] = readAttributeValue(parser)!

    return {
      start,
      value,
      name: name.slice(5),
      end: parser.index,
      type: 'AttributeBinding'
    }
  }

  const value = parser.eat('=') ? readAttributeValue(parser) : true

  return {
    start,
    type: 'Attribute',
    name,
    value,
    end: parser.index
  }
}

export const readEventHandlerDirective = (parser: Parser, name: string): HTML_AST => {
  const quoteMark = parser.eat(`'`) ? `'` : parser.eat(`"`) ? `"` : null

  if (!quoteMark) parser.error('Invalid quote Mark')

  const start = parser.index
  parser.readUntil(new RegExp(quoteMark!))
  const end = parser.index++

  const expression = parseExpressionAt(parser.template.slice(0, end), start, {ecmaVersion: 8})

  if (expression.type !== 'CallExpression') {
    parser.error(`Expected call expression`, start)
  }

  return {
    start,
    end,
    type: 'EventHandler',
    name,
    expression
  }
}

export const readAttributeValue = (parser: Parser): HTML_AST[] | void => {
  if (parser.eat(`'`)) return readQuotedAttributeValue(parser, `'`)
  if (parser.eat(`"`)) return readQuotedAttributeValue(parser, `"`)

  parser.error(`TODO unquoted attribute values`)
}

const readQuotedAttributeValue = (parser: Parser, quoteMark: string): HTML_AST[] | void => {
  let currentChunk: HTML_AST = {
    start: parser.index,
    end: null,
    type: 'Text',
    data: ''
  }

  const chunks = []

  while (parser.index < parser.template.length) {
    if (parser.match(quoteMark)) {
      currentChunk.end = parser.index++
      if (currentChunk.data) {
        chunks.push(currentChunk)
        return chunks
      }
    } else {
      currentChunk.data += parser.template[parser.index++]
    }
  }

  parser.error(`Unexpected end of input`)
}
