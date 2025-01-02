import commonjs from "rollup-plugin-commonjs";
import resolve from 'rollup-plugin-node-resolve';
import {compile} from "./compiler/compile.js";
import * as path from "path";

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
