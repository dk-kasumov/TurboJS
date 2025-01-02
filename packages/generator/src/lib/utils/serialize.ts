export const serializeObject = (object) => {
    return `{ ${Object.entries(object)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')} }`;
}
