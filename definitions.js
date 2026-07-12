export function escapeHtml(str) {
    return str
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export function extractDefinitions(text) {
    const lines = text.split("\n");
    const defs = {};

    for (let line of lines) {
        const match =
            line.match(
                /^(.+?)\s*(?:\:|\-)\s*(.+)$/
            );

        if (match) {
            const term =
                match[1].trim();

            const definition =
                match[2].trim();

            defs[term] =
                definition;
        }
    }

    return defs;
}

export function getDefinitionTerms(text) {
    const lines =
        text.split("\n");

    const defTerms =
        new Set();

    for (let line of lines) {
        const match =
            line.match(
                /^(.+?)\s*(?:\:|\-)\s*(.+)$/
            );

        if (match) {
            defTerms.add(
                match[1].trim()
            );
        }
    }

    return defTerms;
}

export function renderText(text) {

    return {
        html:
            escapeHtml(text),
        definitions:
            extractDefinitions(text)
    };
}

export function getWordAtPoint(
    x,
    y
) {

    let range;

    if (
        document.caretPositionFromPoint
    ) {

        const pos =
            document
                .caretPositionFromPoint(
                    x,
                    y
                );

        if (!pos) {
            return null;
        }

        range =
            document.createRange();

        range.setStart(
            pos.offsetNode,
            pos.offset
        );

        range.setEnd(
            pos.offsetNode,
            pos.offset
        );

    } else if (
        document.caretRangeFromPoint
    ) {

        range =
            document
                .caretRangeFromPoint(
                    x,
                    y
                );
    }

    if (!range) {
        return null;
    }

    const node =
        range.startContainer;

    const offset =
        range.startOffset;

    if (
        !node.nodeValue
    ) {
        return null;
    }

    const text =
        node.nodeValue;

    let start =
        offset;

    let end =
        offset;

    while (
        start > 0 &&
        /\S/.test(
            text[start - 1]
        )
    ) start--;

    while (
        end < text.length &&
        /\S/.test(
            text[end]
        )
    ) end++;

    return text
        .slice(
            start,
            end
        )
        .trim();
}