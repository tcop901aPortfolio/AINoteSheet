import {
    renderText,
    getWordAtPoint
} from "./definitions.js";

import {
    saveTextFile,
    loadTextFile
} from "./fileManager.js";

const editor =
    document.getElementById(
        "editor"
    );

const statusDot =
    document.getElementById(
        "statusdot"
    );

const wordCount =
    document.getElementById(
        "wordcount"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const loadButton =
    document.getElementById(
        "loadButton"
    );

const titleInput =
    document.getElementById(
        "titleInput"
    );

const colorSelect =
    document.getElementById(
        "colorSelect"
    );

const boldButton =
    document.getElementById(
        "boldButton"
    );

const italicButton =
    document.getElementById(
        "italicButton"
    );

const resetStyleButton =
    document.getElementById(
        "resetStyleButton"
    );

const tooltip =
    document.getElementById(
        "tooltip"
    );

const defaultTypingStyle =
    {
        bold: false,
        italic: false,
        color: "black"
    };

const colorCommandMap =
    {
        red: "red",
        yellow: "yellow",
        orange: "orange",
        green: "green",
        blue: "blue",
        purple: "purple",
        black: "black",
        brown: "brown",
        pink: "pink"
    };

const commandPattern =
    /\/\/(bold|normal|italics|reset|red|yellow|orange|green|blue|purple|black|brown|pink)(?=\s|$)/gi;

let styleRuns =
    [
        {
            index: 0,
            style:
                {
                    ...defaultTypingStyle
                }
        }
    ];

let currentTypingStyle =
    {
        ...defaultTypingStyle
    };

let currentText =
    "";

let savedSelection =
    null;

let isNormalizingInput =
    false;

function cloneStyle(
    style
) {
    return {
        bold: style.bold,
        italic: style.italic,
        color: style.color
    };
}

function stylesEqual(
    left,
    right
) {
    return (
        left.bold === right.bold &&
        left.italic === right.italic &&
        left.color === right.color
    );
}

function sortStyleRuns() {
    styleRuns.sort(
        (left, right) =>
            left.index - right.index
    );
}

function getSortedStyleRuns() {
    return [...styleRuns].sort(
        (left, right) =>
            left.index - right.index
    );
}

function normalizeStyleRuns() {
    sortStyleRuns();

    const normalized =
        [];

    for (let run of styleRuns) {
        if (
            normalized.length === 0 ||
            !stylesEqual(
                normalized[
                    normalized.length - 1
                ].style,
                run.style
            )
        ) {
            normalized.push(
                {
                    index: run.index,
                    style:
                        cloneStyle(
                            run.style
                        )
                }
            );
        }
    }

    styleRuns =
        normalized;
}

function getStyleAtIndex(
    index
) {
    let style =
        {
            ...defaultTypingStyle
        };

    for (let run of getSortedStyleRuns()) {
        if (run.index > index) {
            break;
        }

        style =
            run.style;
    }

    return cloneStyle(
        style
    );
}

function setTypingStyleAtIndex(
    index,
    style
) {
    const existingIndex =
        styleRuns.findIndex(
            (run) =>
                run.index === index
        );

    if (existingIndex >= 0) {
        styleRuns[
            existingIndex
        ].style =
            cloneStyle(
                style
            );
    } else {
        styleRuns.push(
            {
                index,
                style:
                    cloneStyle(
                        style
                    )
            }
        );
    }

    sortStyleRuns();
}

function shiftStyleRunsAfterIndex(
    index,
    delta
) {
    styleRuns =
        styleRuns.map(
            (run) =>
                run.index >= index
                    ? {
                        ...run,
                        index:
                            run.index + delta
                    }
                    : run
        );

    sortStyleRuns();
}

function deleteTextRange(
    start,
    end
) {
    const delta =
        end - start;

    styleRuns =
        styleRuns
            .filter(
                (run) =>
                    run.index < start ||
                    run.index >= end
            )
            .map(
                (run) =>
                    run.index >= end
                        ? {
                            ...run,
                            index:
                                run.index - delta
                        }
                        : run
            );

    normalizeStyleRuns();
}

function insertTextRange(
    start,
    length,
    style
) {
    const styleBeforeInsert =
        getStyleAtIndex(
            start
        );

    shiftStyleRunsAfterIndex(
        start,
        length
    );

    setTypingStyleAtIndex(
        start,
        style
    );

    if (
        !stylesEqual(
            styleBeforeInsert,
            style
        )
    ) {
        setTypingStyleAtIndex(
            start + length,
            styleBeforeInsert
        );
    }

    normalizeStyleRuns();
}

function applyStyleToRange(
    start,
    end,
    style
) {
    if (start >= end) {
        return;
    }

    const endStyle =
        getStyleAtIndex(
            end
        );

    setTypingStyleAtIndex(
        start,
        style
    );

    setTypingStyleAtIndex(
        end,
        endStyle
    );

    styleRuns =
        styleRuns.map(
            (run) =>
                run.index > start &&
                run.index < end
                    ? {
                        ...run,
                        style:
                            cloneStyle(
                                style
                            )
                    }
                    : run
        );

    currentTypingStyle =
        cloneStyle(
            style
        );

    normalizeStyleRuns();
}

function getSelectionOffsets(
    element
) {
    const selection =
        window.getSelection();

    if (
        !selection ||
        !selection.rangeCount
    ) {
        return null;
    }

    const range =
        selection.getRangeAt(
            0
        );

    if (
        !element.contains(
            range.commonAncestorContainer
        )
    ) {
        return null;
    }

    const startRange =
        range.cloneRange();
    startRange.selectNodeContents(
        element
    );
    startRange.setEnd(
        range.startContainer,
        range.startOffset
    );

    const endRange =
        range.cloneRange();
    endRange.selectNodeContents(
        element
    );
    endRange.setEnd(
        range.endContainer,
        range.endOffset
    );

    return {
        start:
            startRange.toString().length,
        end:
            endRange.toString().length
    };
}

function restoreSelectionOffsets(
    element,
    selectionOffsets
) {
    if (!selectionOffsets) {
        return;
    }

    const selection =
        window.getSelection();

    if (!selection) {
        return;
    }

    const positions =
        [];

    const walker =
        document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT
        );

    let currentNode =
        walker.nextNode();
    let runningOffset =
        0;

    while (currentNode) {
        positions.push(
            {
                node:
                    currentNode,
                start:
                    runningOffset,
                end:
                    runningOffset +
                    currentNode.textContent.length
            }
        );

        runningOffset +=
            currentNode.textContent.length;
        currentNode =
            walker.nextNode();
    }

    function locate(
        offset
    ) {
        if (positions.length === 0) {
            return null;
        }

        for (let position of positions) {
            if (
                offset >= position.start &&
                offset <= position.end
            ) {
                return {
                    node:
                        position.node,
                    offset:
                        Math.min(
                            offset -
                                position.start,
                            position.node.textContent.length
                        )
                };
            }
        }

        const last =
            positions[
                positions.length - 1
            ];

        return {
            node:
                last.node,
            offset:
                last.node.textContent.length
        };
    }

    const startPos =
        locate(
            selectionOffsets.start
        );
    const endPos =
        locate(
            selectionOffsets.end
        );

    if (
        !startPos ||
        !endPos
    ) {
        return;
    }

    const range =
        document.createRange();
    range.setStart(
        startPos.node,
        startPos.offset
    );
    range.setEnd(
        endPos.node,
        endPos.offset
    );

    selection.removeAllRanges();
    selection.addRange(
        range
    );
}

function setCaretToOffset(
    element,
    offset
) {
    restoreSelectionOffsets(
        element,
        {
            start: offset,
            end: offset
        }
    );
}

function getTextDiff(
    oldText,
    newText
) {
    let start = 0;

    while (
        start < oldText.length &&
        start < newText.length &&
        oldText[start] === newText[start]
    ) {
        start += 1;
    }

    let oldEnd =
        oldText.length;
    let newEnd =
        newText.length;

    while (
        oldEnd > start &&
        newEnd > start &&
        oldText[oldEnd - 1] === newText[newEnd - 1]
    ) {
        oldEnd -= 1;
        newEnd -= 1;
    }

    return {
        start,
        deletedText:
            oldText.slice(
                start,
                oldEnd
            ),
        insertedText:
            newText.slice(
                start,
                newEnd
            )
    };
}

function getCommandStyle(
    command,
    currentStyle
) {
    const nextStyle =
        cloneStyle(
            currentStyle
        );

    switch (
        command
    ) {
        case "bold":
            nextStyle.bold = true;
            return nextStyle;

        case "normal":
            return {
                bold: false,
                italic: false,
                color: currentStyle.color
            };

        case "reset":
            return {
                ...defaultTypingStyle
            };

        case "italics":
            nextStyle.italic = true;
            return nextStyle;

        default:
            if (colorCommandMap[command]) {
                nextStyle.color =
                    colorCommandMap[command];
                return nextStyle;
            }

            return null;
    }
}

function renderStyledPreview(
    text
) {
    const runs =
        getSortedStyleRuns();

    if (
        runs.length === 0
    ) {
        return renderText(
            text
        ).html;
    }

    let html =
        "";

    for (
        let index = 0;
        index < runs.length;
        index += 1
    ) {
        const current =
            runs[index];
        const next =
            runs[index + 1];

        const segment =
            text.slice(
                current.index,
                next
                    ? next.index
                    : text.length
            );

        const rendered =
            renderText(
                segment
            ).html;

        const styleParts =
            [];

        if (current.style.bold) {
            styleParts.push(
                "font-weight: bold"
            );
        }

        if (current.style.italic) {
            styleParts.push(
                "font-style: italic"
            );
        }

        if (
            current.style.color &&
            current.style.color !==
                "black"
        ) {
            styleParts.push(
                `color: ${current.style.color}`
            );
        }

        if (styleParts.length) {
            html +=
                `<span style="${styleParts.join("; ")}">${rendered}</span>`;
        } else {
            html +=
                rendered;
        }
    }

    return html;
}

function updateEditorState(
    text
) {
    editor.innerHTML =
        renderStyledPreview(
            text
        );

    const words =
        text.trim()
            ? text.trim().split(/\s+/).length
            : 0;

    wordCount.textContent =
        `${words} words`;

    currentText =
        text;
}

function applyCommandsFromText(
    text
) {
    let sanitizedText =
        text;

    let commandHandled =
        false;

    let caretIndex =
        null;

    let activeStyle =
        cloneStyle(
            currentTypingStyle
        );

    commandPattern.lastIndex = 0;

    let match =
        commandPattern.exec(
            sanitizedText
        );

    while (match) {
        const command =
            match[1].toLowerCase();

        const nextStyle =
            getCommandStyle(
                command,
                activeStyle
            );

        if (!nextStyle) {
            match =
                commandPattern.exec(
                    sanitizedText
                );
            continue;
        }

        const commandStart =
            match.index;
        const commandLength =
            match[0].length;

        sanitizedText =
            `${sanitizedText.slice(0, commandStart)}${sanitizedText.slice(commandStart + commandLength)}`;

        deleteTextRange(
            commandStart,
            commandStart +
                commandLength
        );

        setTypingStyleAtIndex(
            commandStart,
            nextStyle
        );

        currentTypingStyle =
            cloneStyle(
                nextStyle
            );

        activeStyle =
            cloneStyle(
                nextStyle
            );

        caretIndex =
            commandStart;
        commandHandled =
            true;

        commandPattern.lastIndex = 0;
        match =
            commandPattern.exec(
                sanitizedText
            );
    }

    return {
        text:
            sanitizedText,
        commandHandled,
        caretIndex
    };
}

function setStatus(
    status
) {
    statusDot.style.backgroundColor =
        status === "saved"
            ? "#039a03"
            : status === "unsaved"
                ? "#d9bc3b"
                : "#e39528";
}

function updateToolbarState() {
    colorSelect.value =
        currentTypingStyle.color;

    boldButton.classList.toggle(
        "is-active",
        currentTypingStyle.bold
    );

    italicButton.classList.toggle(
        "is-active",
        currentTypingStyle.italic
    );
}

function applyToolbarStyleChange(
    nextStyle
) {
    const selectionOffsets =
        savedSelection ||
        getSelectionOffsets(
            editor
        );

    if (
        selectionOffsets &&
        selectionOffsets.start !==
            selectionOffsets.end
    ) {
        applyStyleToRange(
            selectionOffsets.start,
            selectionOffsets.end,
            nextStyle
        );
    }

    currentTypingStyle =
        cloneStyle(
            nextStyle
        );

    isNormalizingInput =
        true;

    updateEditorState(
        currentText
    );

    if (selectionOffsets) {
        restoreSelectionOffsets(
            editor,
            selectionOffsets
        );
    }

    isNormalizingInput =
        false;

    editor.focus();
    updateToolbarState();
    setStatus(
        "unsaved"
    );
}

titleInput.addEventListener(
    "focus",
    () => {
        if (titleInput.innerText.trim() === "Title") {
            titleInput.innerText =
                "";
        }
    }
);

titleInput.addEventListener(
    "blur",
    () => {
        if (titleInput.innerText.trim() === "") {
            titleInput.innerText =
                "Title";
        }
    }
);

document.addEventListener(
    "selectionchange",
    () => {
        savedSelection =
            getSelectionOffsets(
                editor
            );
    }
);

editor.addEventListener(
    "input",
    () => {
        if (isNormalizingInput) {
            return;
        }

        const selectionOffsets =
            getSelectionOffsets(
                editor
            );

        const previousText =
            currentText;

        const rawText =
            editor.innerText;

        const commandResult =
            applyCommandsFromText(
                rawText
            );

        if (commandResult.commandHandled) {
            currentText =
                commandResult.text;

            isNormalizingInput =
                true;

            updateEditorState(
                commandResult.text
            );

            setCaretToOffset(
                editor,
                commandResult.caretIndex ??
                    commandResult.text.length
            );

            isNormalizingInput =
                false;

            updateToolbarState();
            setStatus(
                "unsaved"
            );
            return;
        }

        const diff =
            getTextDiff(
                previousText,
                rawText
            );

        if (diff.deletedText.length) {
            deleteTextRange(
                diff.start,
                diff.start +
                    diff.deletedText.length
            );
        }

        if (diff.insertedText.length) {
            insertTextRange(
                diff.start,
                diff.insertedText.length,
                currentTypingStyle
            );
        }

        isNormalizingInput =
            true;

        updateEditorState(
            rawText
        );

        setCaretToOffset(
            editor,
            selectionOffsets
                ? selectionOffsets.end
                : rawText.length
        );

        isNormalizingInput =
            false;

        setStatus(
            "unsaved"
        );
    }
);

function interceptToolbarButton(
    event
) {
    event.preventDefault();
}

boldButton.addEventListener(
    "mousedown",
    interceptToolbarButton
);

italicButton.addEventListener(
    "mousedown",
    interceptToolbarButton
);

resetStyleButton.addEventListener(
    "mousedown",
    interceptToolbarButton
);

colorSelect.addEventListener(
    "change",
    () => {
        applyToolbarStyleChange(
            {
                ...currentTypingStyle,
                color:
                    colorSelect.value
            }
        );
    }
);

boldButton.addEventListener(
    "click",
    () => {
        applyToolbarStyleChange(
            {
                ...currentTypingStyle,
                bold:
                    !currentTypingStyle.bold
            }
        );
    }
);

italicButton.addEventListener(
    "click",
    () => {
        applyToolbarStyleChange(
            {
                ...currentTypingStyle,
                italic:
                    !currentTypingStyle.italic
            }
        );
    }
);

resetStyleButton.addEventListener(
    "click",
    () => {
        applyToolbarStyleChange(
            {
                ...defaultTypingStyle
            }
        );
    }
);

saveButton.addEventListener(
    "click",
    async () => {
        await saveTextFile(
            titleInput.innerText.trim(),
            editor.textContent
        );

        setStatus(
            "saved"
        );
    }
);

loadButton.addEventListener(
    "click",
    async () => {
        const file =
            await loadTextFile();

        editor.textContent =
            file.text;

        styleRuns =
            [
                {
                    index: 0,
                    style:
                        {
                            ...defaultTypingStyle
                        }
                }
            ];

        currentTypingStyle =
            {
                ...defaultTypingStyle
            };

        titleInput.innerText =
            file.title;

        updateEditorState(
            file.text
        );

        updateToolbarState();

        setStatus(
            "saved"
        );
    }
);

updateEditorState(
    editor.innerText
);

updateToolbarState();