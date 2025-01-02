import {tag} from './tag.js';
import {text} from './text.js';
import {mustache} from "./mustache.js";
import {Parser} from '../@models/parser.model'

export function fragment(parser: Parser) {
    if (parser.match('<')) {
        return tag;
    }

    if (parser.match('{{')) {
        return mustache;
    }

    return text;
}
