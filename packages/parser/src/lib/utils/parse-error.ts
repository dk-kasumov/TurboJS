import {locate} from 'locate-character';

export const ParseError = (message: string, template: string, index: number): string => {
    const {line, column} = locate(template, index)!;
    return `${message} (${line + 1}:${column})`;
}
