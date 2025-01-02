import {Expression, Program} from 'acorn'

export interface AcornError {
  pos: number
  message: string
}

export interface HTML_AST {
  start: number
  end: number | null
  type: 'Fragment' | 'Text' | 'EventHandler' | 'AttributeBinding' | 'Attribute' | 'MustacheTag' | 'Element'
  tagName?: string | void
  name?: string
  children?: HTML_AST[]
  data?: string
  expression?: Expression
  value?: string | HTML_AST | HTML_AST[] | void | boolean
  attributes?: HTML_AST[]
}

export interface SCRIPT_AST {
  start: number
  end: number
  attributes: HTML_AST[]
  content: Program
}

export interface STYLE_AST {
  start: number
  end: number
  attributes: HTML_AST[]
  content: {
    start: number
    end: number
    styles: string | null
  }
}

export interface Parser {
  index: number
  template: string
  stack: HTML_AST[]
  html: HTML_AST
  css: STYLE_AST | null
  js: SCRIPT_AST | null
  current: () => HTML_AST
  acornError: (err: AcornError) => void
  error: (message: string, index?: number) => any
  match: (str: string) => boolean
  eat: (str: string, required?: boolean) => boolean | undefined
  allowWhitespace: () => void
  read: (pattern: RegExp) => string | null
  readUntil: (pattern: RegExp) => string | null
  remaining: () => string
  requireWhitespace: () => void
}

export interface ParseResult {
  html: HTML_AST
  css: STYLE_AST | null
  js: SCRIPT_AST | null
}
