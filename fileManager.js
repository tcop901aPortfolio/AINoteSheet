let folderHandle = null;
let currentFileHandle = null;
let currentFileName = null;

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
            await window
                .showDirectoryPicker();
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

export async function loadTextFile() {

    const [fileHandle] =
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

    currentFileHandle =
        fileHandle;

    const file =
        await fileHandle
            .getFile();

    const text =
        await file.text();

    const documentData =
        parseDocument(
            text
        );

    currentFileName =
        file.name.replace(
            ".txt",
            ""
        );

    return {
        ...documentData,
        title:
            currentFileName
    };
}