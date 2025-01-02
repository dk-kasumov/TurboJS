import {parseExpressionAt} from 'acorn';

export function readExpression(parser) {
    try {
        const node = parseExpressionAt(parser.template, parser.index);
        parser.index = node.end;
        return node;
    } catch (err) {
        parser.acornError(err);
    }
}
