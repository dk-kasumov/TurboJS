import {trimEnd, trimStart} from "../utils/trim.js";
import {readAttribute} from "./directive.js";
import {readScript} from "../read/script.js";
import {readStyle} from "../read/style.js";

const validTagName = /^[a-zA-Z]{1,}:?[a-zA-Z0-9\-]*/;
const specials = {
    script: {
        read: readScript,
        property: 'js'
    },

    style: {
        read: readStyle,
        property: 'css'
    }
};

function readTagName(parser) {
    const start = parser.index;
    const name = parser.readUntil(/(\s|\/|>)/);

    if (validTagName.test(name)) return name;

    parser.error(`Expected valid tag name`, start)
}

export function tag(parser) {
    const start = parser.index++;
    const isClosingTag = parser.eat('/');
    const name = readTagName(parser);

    parser.allowWhitespace();

    if (isClosingTag) {
        if (!parser.eat('>')) parser.error(`Expected '>'`);

        const element = parser.current();

        if (element.children.length) {
            const firstChild = element.children[0];
            const lastChild = element.children[element.children.length - 1];

            if (firstChild.type === 'Text') {
                firstChild.data = trimStart(firstChild.data);
                if (!firstChild.data) element.children.shift();
            }

            if (lastChild.type === 'Text') {
                lastChild.data = trimEnd(lastChild.data);
                if (!lastChild.data) element.children.pop();
            }
        }

        element.end = parser.index;
        parser.stack.pop();

        return null;
    }

    const attributes = [];

    let attribute;
    while (attribute = readAttribute(parser)) {
        attributes.push({...attribute, tagName: name});
        parser.allowWhitespace();
    }

    parser.allowWhitespace();

    if (name in specials) {
        const special = specials[name];

        parser.eat('>', true);
        parser[special.property] = special.read(parser, start, attributes);
        return;
    }

    const element = {
        start,
        end: null,
        type: 'Element',
        name,
        attributes,
        children: []
    }

    parser.current().children.push(element);
    parser.eat('>', true);
    parser.stack.push(element);

    return null;
}
