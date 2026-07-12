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

let isNormalizingInput =
    false;

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

function cloneStyle(
    style
) {
    return {
        bold: style.bold,
        italic: style.italic,
        color: style.color
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

function setTypingStyleAtIndex(
    index,
    style
) {

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

function shiftStyleRunsAfterIndex(
    index,
    delta
) {

    styleRuns =
        styleRuns.map(
            (run) =>
                run.index > index
                    ? {
                        ...run,
                        index:
                            run.index + delta
                    }
                    : run
        );
}

function setCaretToOffset(
    element,
    offset
) {

    const selection =
        window.getSelection();

    if (!selection) {
        return;
    }

    const range =
        document.createRange();

    const walker =
        document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT
        );

    let currentNode =
        walker.nextNode();
    let remaining =
        offset;

    while (
        currentNode
    ) {

        const nodeLength =
            currentNode.textContent.length;

        if (
            remaining <=
            nodeLength
        ) {
            range.setStart(
                currentNode,
                remaining
            );
            range.collapse(
                true
            );
            selection.removeAllRanges();
            selection.addRange(
                range
            );
            return;
        }

        remaining -=
            nodeLength;
        currentNode =
            walker.nextNode();
    }

    range.selectNodeContents(
        element
    );
    range.collapse(
        false
    );

    selection.removeAllRanges();
    selection.addRange(
        range
    );
}

function getCaretOffset(
    element
) {

    const selection =
        window.getSelection();

    if (
        !selection ||
        !selection.rangeCount
    ) {
        return 0;
    }

    const range =
        selection.getRangeAt(
            0
        );

    const preRange =
        range.cloneRange();

    preRange.selectNodeContents(
        element
    );
    preRange.setEnd(
        range.startContainer,
        range.startOffset
    );

    return preRange
        .toString()
        .length;
}

function getStyleRunsForText(
    text
) {

    const sortedRuns =
        [...styleRuns]
            .sort(
                (left, right) =>
                    left.index - right.index
            );

    const runs =
        [];

    for (
        let index = 0;
        index < sortedRuns.length;
        index += 1
    ) {

        const current =
            sortedRuns[index];

        const next =
            sortedRuns[
                index + 1
            ];

        runs.push(
            {
                start:
                    current.index,
                end:
                    next
                        ? next.index
                        : text.length,
                style:
                    current.style
            }
        );
    }

    return runs;
}

function renderStyledPreview(
    text
) {

    const runs =
        getStyleRunsForText(
            text
        );

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
        let run of runs
    ) {

        const segment =
            text.slice(
                run.start,
                run.end
            );

        const rendered =
            renderText(
                segment
            ).html;

        const styleParts =
            [];

        if (run.style.bold) {
            styleParts.push(
                "font-weight: bold"
            );
        }

        if (run.style.italic) {
            styleParts.push(
                "font-style: italic"
            );
        }

        if (
            run.style.color &&
            run.style.color !==
                "black"
        ) {
            styleParts.push(
                `color: ${run.style.color}`
            );
        }

        if (
            styleParts.length
        ) {
            html +=
                `<span style="${styleParts.join("; ")}">${rendered}</span>`;
        } else {
            html +=
                rendered;
        }
    }

    return html;
}

function applyCommandIfPresent(
    text
) {

    let sanitizedText =
        text;

    let commandHandled =
        false;

    let caretIndex =
        null;

    let currentStyle =
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
                command
                ,
                currentStyle
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

        shiftStyleRunsAfterIndex(
            commandStart,
            -commandLength
        );

        setTypingStyleAtIndex(
            commandStart,
            nextStyle
        );

        currentStyle =
            nextStyle;

        currentTypingStyle =
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

function updateEditorState(
    text
) {

    const result =
        renderStyledPreview(
            text
        );

    editor.innerHTML =
        result;

    const words =
        text.trim()
            ? text
                .trim()
                .split(/\s+/)
                .length
            : 0;

    wordCount.textContent =
        `${words} words`;
}

function moveCaretByRepeatLevel(
    direction,
    repeatLevel
) {

    const selection =
        window.getSelection();

    if (
        !selection ||
        !selection.rangeCount
    ) {
        return;
    }

    const action =
        repeatLevel >= 3
            ? "lineboundary"
            : "word";

    selection.modify(
        "move",
        direction,
        action
    );
}

const arrowKeyState =
    {
        ArrowLeft: {
            count: 0,
            timer: null
        },
        ArrowRight: {
            count: 0,
            timer: null
        }
    };

editor.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key !==
                "ArrowLeft" &&
            event.key !==
                "ArrowRight" ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
        ) {
            return;
        }

        const state =
            arrowKeyState[
                event.key
            ];

        if (state.timer) {
            clearTimeout(
                state.timer
            );
        }

        state.count =
            event.repeat
                ? state.count
                : state.count + 1;

        if (state.count === 1) {
            state.timer =
                setTimeout(
                    () => {
                        state.count = 0;
                        state.timer = null;
                    },
                    350
                );

            return;
        }

        event.preventDefault();

        moveCaretByRepeatLevel(
            event.key ===
                "ArrowRight"
                ? "forward"
                : "backward",
            state.count
        );

        state.count =
            Math.min(
                state.count,
                3
            );

        state.timer =
            setTimeout(
                () => {
                    state.count = 0;
                    state.timer = null;
                },
                350
            );
    }
);

function setStatus(
    status
) {

    statusDot
        .style
        .backgroundColor =
        status ===
        "saved"
            ? "#039a03"
            : status ===
              "unsaved"
            ? "#d9bc3b"
            : "#e39528";
}

// REMOVE placeholder text on focus
titleInput.addEventListener("focus", () => {
    if (titleInput.innerText.trim() === "Title") {
        titleInput.innerText = "";
    }
});

// restore placeholder if empty on blur
titleInput.addEventListener("blur", () => {
    if (titleInput.innerText.trim() === "") {
        titleInput.innerText = "Title";
    }
});

editor.addEventListener(
    "input",
    () => {

        if (isNormalizingInput) {
            return;
        }

        const caretOffset =
            getCaretOffset(
                editor
            );

        const text =
            editor.innerText;

        const commandResult =
            applyCommandIfPresent(
                text
            );

        if (
            commandResult.commandHandled
        ) {
        }

        isNormalizingInput =
            true;

        updateEditorState(
            commandResult.text
        );

        setCaretToOffset(
            editor,
            commandResult.caretIndex ??
                caretOffset
        );

        isNormalizingInput =
            false;

        setStatus(
            "unsaved"
        );
    }
);

saveButton.addEventListener("click", async () => {

            await saveTextFile(
                titleInput
                    .innerText
                    .trim(),
                editor
                    .textContent
            );

            setStatus(
                "saved"
            );
        }
    );

loadButton
    .addEventListener(
        "click",
        async () => {

            const file =
                await loadTextFile();

            editor
                .textContent =
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

            titleInput
                .innerText =
                file.title;

            updateEditorState(
                file.text
            );

            setStatus(
                "saved"
            );
        }
    );

updateEditorState(
    editor.innerText
);