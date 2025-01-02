import {tag} from './tag.js';
import {text} from './text.js';
import {mustache} from "./mustache.js";

export function fragment(parser) {
    if (parser.match('<')) {
        return tag;
    }

    if (parser.match('{{')) {
        return mustache;
    }

    return text;
}
