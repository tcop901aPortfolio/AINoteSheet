import {
    renderText,
    getWordAtPoint
} from "./definitions.js";

import {
    saveTextFile,
    loadTextFile
} from "./filemanager.js";

if (typeof window !== 'undefined') {

    const maxChars = 75;

    const editor =
        document.getElementById('editor');

    const statusDot =
        document.getElementById('statusdot');

    const wordCount =
        document.getElementById('wordcount');

    const saveButton =
        document.getElementById('saveButton');

    const loadButton =
        document.getElementById('loadButton');

    const titleInput =
        document.getElementById('titleInput');

    const preview =
        document.getElementById('preview');

    const tooltip =
        document.getElementById("tooltip");

    let currentDefinitions = {};

    function normalizeText(text) {
        return text.replace(/\n{3,}/g, "\n\n");
    }

    function setStatus(status) {
        statusDot.style.backgroundColor =
            status === 'saved'
                ? '#039a03'
                : status === 'unsaved'
                ? '#d9bc3b'
                : status === 'newFile'
                ? '#e39528'
                : '#afaba5';
    }

    // ==========================
    // EDITOR RENDERING
    // ==========================

    editor.addEventListener('input', () => {

        setStatus('unsaved');

        const text =
            editor.textContent.trim();

        const words = text
            ? text.split(/\s+/).length
            : 0;

        wordCount.textContent =
            `${words} word${words !== 1 ? 's' : ''}`;

        const newText =
            editor.innerText;

        const result =
            renderText(
                normalizeText(newText)
            );

        preview.innerHTML =
            result.html;

        currentDefinitions =
            result.definitions;
    });

    editor.addEventListener("scroll", () => {
        preview.scrollTop =
            editor.scrollTop;
    });

    // ==========================
    // TOOLTIP
    // ==========================

    editor.addEventListener(
        "mousemove",
        (e) => {

            const word =
                getWordAtPoint(
                    e.clientX,
                    e.clientY
                );

            if (!word) {
                tooltip.style.display =
                    "none";
                return;
            }

            const definition =
                currentDefinitions[
                    word.trim()
                ];

            if (!definition) {
                tooltip.style.display =
                    "none";
                return;
            }

            tooltip.textContent =
                definition;

            tooltip.style.display =
                "block";

            tooltip.style.left =
                (e.pageX + 10) + "px";

            tooltip.style.top =
                (e.pageY + 10) + "px";
        }
    );

    editor.addEventListener(
        "mouseleave",
        () => {
            tooltip.style.display =
                "none";
        }
    );

    // ==========================
    // SAVE / LOAD
    // ==========================

    saveButton.addEventListener(
        'click',
        async () => {
            try {

                await saveTextFile(
                    titleInput.innerText.trim(),
                    editor.textContent
                );

                setStatus('saved');

            } catch (err) {
                console.error(
                    'Error saving:',
                    err
                );
            }
        }
    );

    loadButton.addEventListener(
        'click',
        async () => {
            try {

                const file =
                    await loadTextFile();

                editor.textContent =
                    file.text;

                titleInput.innerText =
                    file.title;

                const result =
                    renderText(file.text);

                preview.innerHTML =
                    result.html;

                currentDefinitions =
                    result.definitions;

                setStatus('saved');

            } catch (err) {
                console.error(
                    'Error loading:',
                    err
                );
            }
        }
    );

    // ==========================
    // TITLE INPUT
    // ==========================

    titleInput.addEventListener(
        "focus",
        function () {
            if (
                titleInput.innerText.trim()
                === "Title"
            ) {
                titleInput.innerText =
                    "";
            }
        }
    );

    titleInput.addEventListener(
        "blur",
        function () {
            if (
                titleInput.innerText.trim()
                === ""
            ) {
                titleInput.innerText =
                    "Title";
            }
        }
    );

    titleInput.addEventListener(
        "input",
        () => {

            const text =
                titleInput.textContent;

            if (
                text.length >
                maxChars
            ) {
                titleInput.textContent =
                    text.substring(
                        0,
                        maxChars
                    );
            }

            setStatus('newFile');
        }
    );
}