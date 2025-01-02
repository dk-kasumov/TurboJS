export const serializeObject = (object: Object) => {
    return `{ ${Object.entries(object)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')} }`;
}
