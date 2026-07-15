let folderHandle = null;
let currentFileHandle = null;
let currentFileName = null;

const folderStoreName = "AINoteSheetFolderState";
const folderStoreVersion = 1;
const folderStoreKey = "folderHandle";

function openFolderStore() {
    return new Promise(
        (resolve, reject) => {
            const request =
                indexedDB.open(
                    folderStoreName,
                    folderStoreVersion
                );

            request.onupgradeneeded = () => {
                const database =
                    request.result;

                if (
                    !database.objectStoreNames.contains(
                        "handles"
                    )
                ) {
                    database.createObjectStore(
                        "handles"
                    );
                }
            };

            request.onsuccess = () => {
                resolve(
                    request.result
                );
            };

            request.onerror = () => {
                reject(
                    request.error
                );
            };
        }
    );
}

async function readStoredHandle() {
    if (
        typeof indexedDB === "undefined"
    ) {
        return null;
    }

    const database =
        await openFolderStore();

    return new Promise(
        (resolve, reject) => {
            const transaction =
                database.transaction(
                    "handles",
                    "readonly"
                );

            const store =
                transaction.objectStore(
                    "handles"
                );

            const request =
                store.get(
                    folderStoreKey
                );

            request.onsuccess = () => {
                resolve(
                    request.result || null
                );
            };

            request.onerror = () => {
                reject(
                    request.error
                );
            };
        }
    );
}

async function writeStoredHandle(handle) {
    if (
        typeof indexedDB === "undefined"
    ) {
        return;
    }

    const database =
        await openFolderStore();

    await new Promise(
        (resolve, reject) => {
            const transaction =
                database.transaction(
                    "handles",
                    "readwrite"
                );

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                reject(
                    transaction.error
                );
            };

            transaction.objectStore(
                "handles"
            ).put(
                handle,
                folderStoreKey
            );
        }
    );
}

async function ensureFolderHandleAccess(handle) {
    if (!handle) {
        return false;
    }

    try {
        const permission =
            await handle.queryPermission({
                mode: "readwrite"
            });

        return permission === "granted";
    } catch {
        return false;
    }
}

function stripTxtSuffix(name) {
    return name.replace(/\.txt$/i, "");
}

function normalizeDocumentData(documentData) {
    return {
        text: documentData.text || "",
        styleRuns: Array.isArray(documentData.styleRuns) && documentData.styleRuns.length
            ? documentData.styleRuns
            : [
                {
                    index: 0,
                    style: {
                        bold: false,
                        italic: false,
                        color: "black"
                    }
                }
            ],
        currentTypingStyle: documentData.currentTypingStyle && typeof documentData.currentTypingStyle === "object"
            ? documentData.currentTypingStyle
            : {
                bold: false,
                italic: false,
                color: "black"
            }
    };
}

function serializeDocument(
    documentData
) {
    return JSON.stringify(
        {
            version: 1,
            ...documentData
        },
        null,
        2
    );
}

function parseDocument(
    text
) {
    try {
        const parsed =
            JSON.parse(
                text
            );

        if (
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.text === "string"
        ) {
            return parsed;
        }
    } catch {
        // fall through to plain-text handling
    }

    return {
        version: 0,
        text,
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
        }
    };
}

export async function saveTextFile(
    title,
    documentData
) {

    const newName =
        (title || "Untitled")
        + ".txt";

    if (
        currentFileHandle &&
        newName ===
        currentFileName
        + ".txt"
    ) {

        const writable =
            await currentFileHandle
                .createWritable();

        await writable.write(
            serializeDocument(
                documentData
            )
        );

        await writable.close();

        return;
    }

    if (!folderHandle) {
        folderHandle =
            await selectFolderHandle();
    }

    const newFileHandle =
        await folderHandle
            .getFileHandle(
                newName,
                {
                    create:
                        true
                }
            );

    const writable =
        await newFileHandle
            .createWritable();

    await writable.write(
        serializeDocument(
            documentData
        )
    );

    await writable.close();

    currentFileHandle =
        newFileHandle;

    currentFileName =
        title;
}

export async function getStoredFolderHandle() {
    if (folderHandle) {
        return folderHandle;
    }

    const storedHandle =
        await readStoredHandle();

    if (
        storedHandle &&
        await ensureFolderHandleAccess(
            storedHandle
        )
    ) {
        folderHandle =
            storedHandle;
    }

    return folderHandle;
}

export async function selectFolderHandle() {
    const selectedHandle =
        await window
            .showDirectoryPicker({
                mode: "readwrite"
            });

    folderHandle =
        selectedHandle;

    await writeStoredHandle(
        selectedHandle
    );

    return folderHandle;
}

export async function listFolderTextFiles() {
    const activeFolderHandle =
        await getStoredFolderHandle();

    if (!activeFolderHandle) {
        return [];
    }

    const files =
        [];

    try {
        for await (const [name, handle] of activeFolderHandle.entries()) {
            if (
                handle.kind === "file" &&
                name.toLowerCase().endsWith(
                    ".txt"
                )
            ) {
                files.push({
                    name,
                    title:
                        stripTxtSuffix(
                            name
                        ),
                    handle
                });
            }
        }
    } catch {
        return [];
    }

    return files.sort(
        (left, right) =>
            left.name.localeCompare(
                right.name
            )
    );
}

export async function loadTextFile(fileHandle) {
    let activeFileHandle =
        fileHandle;

    if (!activeFileHandle) {
        const [pickedFileHandle] =
            await window
                .showOpenFilePicker({
                    types: [{
                        description:
                            "Text Files",

                        accept: {
                            "text/plain":
                                [".txt"]
                        }
                    }],
                    multiple:
                        false
                });

        activeFileHandle =
            pickedFileHandle;
    }

    currentFileHandle =
        activeFileHandle;

    const file =
        await activeFileHandle
            .getFile();

    const text =
        await file.text();

    const documentData =
        parseDocument(
            text
        );

    currentFileName =
        stripTxtSuffix(
            file.name
        );

    return {
        ...normalizeDocumentData(
            documentData
        ),
        title:
            currentFileName
    };
}