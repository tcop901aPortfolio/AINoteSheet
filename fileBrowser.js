import {
    saveTextFile,
    loadTextFile,
    selectFolderHandle,
    getStoredFolderHandle,
    listFolderTextFiles
} from "./fileManager.js";

export function createFileBrowserController(
    {
        loadButton,
        startupOverlay,
        startupSelectFolderButton,
        fileBrowser,
        folderName,
        fileList,
        browserSelectFolderButton,
        refreshFilesButton,
        newFileButton,
        styleEditor
    }
) {
    let activeFolderFiles =
        [];

    function showFolderStartup() {
        document.body.classList.remove(
            "has-browser"
        );

        fileBrowser.classList.add(
            "hidden"
        );

        startupOverlay.classList.remove(
            "hidden"
        );

        startupOverlay.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    function showFolderBrowser() {
        document.body.classList.add(
            "has-browser"
        );

        startupOverlay.classList.add(
            "hidden"
        );

        startupOverlay.setAttribute(
            "aria-hidden",
            "true"
        );

        fileBrowser.classList.remove(
            "hidden"
        );
    }

    function hideFolderBrowser() {
        document.body.classList.remove(
            "has-browser"
        );

        fileBrowser.classList.add(
            "hidden"
        );

        startupOverlay.classList.add(
            "hidden"
        );

        startupOverlay.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function normalizeFileTitle(
        title
    ) {
        return title
            .replace(/\.txt$/i, "")
            .trim();
    }

    function resolveUniqueFileTitle(
        title
    ) {
        const baseTitle =
            normalizeFileTitle(
                title
            ) || "Untitled";

        const existingTitles =
            new Set(
                activeFolderFiles.map(
                    (file) =>
                        file.title.toLowerCase()
                )
            );

        let candidate =
            baseTitle;
        let index =
            2;

        while (
            existingTitles.has(
                candidate.toLowerCase()
            )
        ) {
            candidate =
                `${baseTitle} ${index}`;
            index += 1;
        }

        return candidate;
    }

    function renderFolderFiles(
        files
    ) {
        fileList.innerHTML =
            "";

        if (!files.length) {
            const emptyState =
                document.createElement(
                    "div"
                );

            emptyState.className =
                "fileListEmpty";
            emptyState.textContent =
                "No .txt files yet. Create one to start a new note in this folder.";

            fileList.appendChild(
                emptyState
            );
            return;
        }

        for (const file of files) {
            const item =
                document.createElement(
                    "button"
                );

            item.type =
                "button";
            item.className =
                "fileItem";

            if (
                file.title ===
                styleEditor.getCurrentTitle()
            ) {
                item.classList.add(
                    "is-active"
                );
            }

            const name =
                document.createElement(
                    "div"
                );
            name.className =
                "fileItemName";
            name.textContent =
                file.title;

            const meta =
                document.createElement(
                    "div"
                );
            meta.className =
                "fileItemMeta";
            meta.textContent =
                file.name;

            item.appendChild(
                name
            );
            item.appendChild(
                meta
            );

            item.addEventListener(
                "click",
                async () => {
                    const fileData =
                        await loadTextFile(
                            file.handle
                        );

                    styleEditor.applyLoadedDocument(
                        fileData
                    );

                    styleEditor.setCurrentTitle(
                        fileData.title ||
                            file.title
                    );

                    hideFolderBrowser();
                    styleEditor.focusEditor();

                    await refreshFolderBrowser();
                }
            );

            fileList.appendChild(
                item
            );
        }
    }

    async function refreshFolderBrowser() {
        activeFolderFiles =
            await listFolderTextFiles();

        const folderHandle =
            await getStoredFolderHandle();

        folderName.textContent =
            folderHandle?.name ||
            "No folder selected";

        renderFolderFiles(
            activeFolderFiles
        );
    }

    async function openFolderBrowser() {
        const folderHandle =
            await getStoredFolderHandle();

        if (!folderHandle) {
            showFolderStartup();
            return;
        }

        showFolderBrowser();
        await refreshFolderBrowser();
    }

    async function chooseFolderAndOpenBrowser() {
        await selectFolderHandle();
        await openFolderBrowser();
    }

    async function createNewFileInFolder() {
        const requestedTitle =
            window.prompt(
                "New file name",
                "Untitled"
            );

        if (requestedTitle === null) {
            return;
        }

        const nextTitle =
            resolveUniqueFileTitle(
                requestedTitle
            );

        styleEditor.resetToBlankDocument();
        styleEditor.setCurrentTitle(
            nextTitle
        );

        await saveTextFile(
            nextTitle,
            styleEditor.getCurrentDocumentData()
        );

        styleEditor.applyLoadedDocument(
            {
                text: "",
                styleRuns: [
                    {
                        index: 0,
                        style: {
                            bold: false,
                            italic: false,
                            color: "black"
                        }
                    }
                ],
                currentTypingStyle: {
                    bold: false,
                    italic: false,
                    color: "black"
                },
                title: nextTitle
            }
        );

        hideFolderBrowser();
        styleEditor.focusEditor();

        await refreshFolderBrowser();
    }

    function initialize() {
        loadButton.addEventListener(
            "click",
            async () => {
                await openFolderBrowser();
            }
        );

        startupSelectFolderButton.addEventListener(
            "click",
            async () => {
                await chooseFolderAndOpenBrowser();
            }
        );

        browserSelectFolderButton.addEventListener(
            "click",
            async () => {
                await chooseFolderAndOpenBrowser();
            }
        );

        refreshFilesButton.addEventListener(
            "click",
            async () => {
                await refreshFolderBrowser();
            }
        );

        newFileButton.addEventListener(
            "click",
            async () => {
                await createNewFileInFolder();
            }
        );
    }

    async function bootstrapFolderBrowser() {
        const folderHandle =
            await getStoredFolderHandle();

        if (!folderHandle) {
            showFolderStartup();
            return;
        }

        showFolderBrowser();
        await refreshFolderBrowser();
    }

    return {
        initialize,
        bootstrapFolderBrowser,
        refreshFolderBrowser,
        openFolderBrowser,
        hideFolderBrowser
    };
}
