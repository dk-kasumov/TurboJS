export function counter() {
    const counts = {};

    return function (label) {
        if (label in counts) {
            return `_${label}${counts[label]++}`;
        }

        counts[label] = 1;
        return `_${label}`;
    };
}
