import {whitespace} from './constants.js'
import {fragment} from './state/fragment.js'
import {ParseError} from './utils/parse-error.js'
import {Parser, ParseResult} from './@models/parser.model'

export const parse = (template: string): ParseResult => {
  const parser: Parser = {
    index: 0,
    template,
    stack: [],

    current() {
      return this.stack[this.stack.length - 1]
    },

    acornError(err) {
      parser.error(err.message.replace(/\(\d+:\d+\)$/, ''), err.pos)
    },

    // @ts-ignore
    error(message, index = this.index) {
      // @ts-ignore
      throw ParseError(message, this.template, index)
    },

    match(str) {
      return this.template.slice(this.index, this.index + str.length) === str
    },

    eat(str, required) {
      if (this.match(str)) {
        this.index += str.length
        return true
      }

      if (required) {
        return this.error(`Expected ${str}`)
      }
    },

    allowWhitespace() {
      while (this.index < this.template.length && whitespace.test(this.template[this.index])) {
        this.index++
      }
    },

    read(pattern) {
      const match = pattern.exec(this.template.slice(this.index))
      if (!match || match.index !== 0) return null

      parser.index += match[0].length

      return match[0]
    },

    readUntil(pattern) {
      const match = pattern.exec(this.template.slice(this.index))
      return this.template.slice(this.index, match ? (this.index += match.index) : this.template.length)
    },

    remaining() {
      return this.template.slice(this.index)
    },

    requireWhitespace() {
      if (!whitespace.test(this.template[this.index])) {
        this.error(`Expected whitespace`)
      }

      this.allowWhitespace()
    },

    html: {
      start: 0,
      end: template.length,
      type: 'Fragment',
      children: []
    },

    css: null,

    js: null
  }

  parser.stack.push(parser.html)
  let state: any = fragment

  while (parser.index < parser.template.length) {
    state = state(parser) || fragment
  }

  return {
    html: parser.html,
    css: parser.css,
    js: parser.js
  }
}
