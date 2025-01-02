import {parse, tokenizer} from 'acorn';
import {spaces} from '../utils/spaces.js';
import {Parser, SCRIPT_AST} from '../@models/parser.model'

export const readScript = (parser: Parser, start: number, attributes = []): SCRIPT_AST => {
    const scriptStart = parser.index;
    let scriptEnd = null;

    for (const token of tokenizer(parser.remaining(), {ecmaVersion: 8})) {
        parser.index = scriptStart + token.end;
        parser.allowWhitespace();

        if (parser.eat('</script>')) {
            scriptEnd = scriptStart + token.end;
            break;
        }
    }

    const source = spaces(scriptStart) + parser.template.slice(scriptStart, scriptEnd!);
    const ast = parse(source, {
        ecmaVersion: 8,
        sourceType: 'module'
    })

    ast.start = scriptStart;

    return {
        start,
        end: parser.index,
        attributes,
        content: ast
    }
}
