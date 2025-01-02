import {whitespace} from '../constants.js'

export const trimStart = (str: string): string => {
  let i = 0
  while (whitespace.test(str[i])) i += 1

  return str.slice(i)
}

export const trimEnd = (str: string): string => {
  let i = str.length
  while (whitespace.test(str[i - 1])) i -= 1

  return str.slice(0, i)
}
