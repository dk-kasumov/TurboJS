import {Parser} from '../@models/parser.model'

export const text = (parser: Parser) => {
    const start = parser.index;

    let data = '';

    while (parser.index < parser.template.length && !parser.match('<') && !parser.match('{{')) {
        data += parser.template[parser.index++];
    }

    parser.current().children!.push({
        start,
        end: parser.index,
        type: 'Text',
        data
    });

    return null;
}
