import commonjs from "rollup-plugin-commonjs";
import resolve from 'rollup-plugin-node-resolve';
import * as path from "path";
import {generate} from '@turbo/generator'
import {parse} from '@turbo/parser'

const compile = (template, isEntryPoint) => {
    const parsed = parse(template);
    return generate(parsed, template, isEntryPoint);
}

function turboRollupPlugin({input}) {
    return {
        name: 'turbo',

        transform(code, id) {
            const entryPath = path.resolve(input);

            if (id.endsWith('.turbo')) {
                const res = compile(code, id === entryPath);

                return {
                    code: res.code,
                    map: null,
                    minify: true
                };
            }

            return null;
        },
    };
}

export default {
    input: 'src/main.turbo',
    output: {
        file: 'src/bundle.js',
        format: 'iife'
    },
    plugins: [
        turboRollupPlugin({input: 'src/main.turbo'}),
        resolve(),
        commonjs(),
    ],
};
