import {locate} from 'locate-character';

export function ParseError(message, template, index) {
    const {line, column} = locate(template, index);
    return `${message} (${line + 1}:${column})`;
}
