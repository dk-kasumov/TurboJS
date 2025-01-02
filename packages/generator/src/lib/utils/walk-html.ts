export function walkHtml(html, visitors) {
    function visit(node) {
        const visitor = visitors[node.type];
        if (!visitor) throw new Error(`Not implemented: ${node.type}`);

        if (visitor.enter) visitor.enter(node);

        if (node.attributes) {
            node.attributes.forEach(child => {
                visit(child);
            });
        }

        if (node.children) {
            node.children.forEach(child => {
                visit(child);
            });
        }

        if (visitor.leave) visitor.leave(node);
    }

    html.children.forEach(node => {
        visit(node);
    })
}
