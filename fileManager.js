// fileManager.js

let folderHandle = null;
let currentFileHandle = null;
let currentFileName = null;

export async function saveTextFile(title, content) {
    const newName = (title || "Untitled") + ".txt";

    if (
        currentFileHandle &&
        newName === currentFileName + ".txt"
    ) {
        const writable =
            await currentFileHandle.createWritable();

        await writable.write(content);
        await writable.close();

        return;
    }

    if (!folderHandle) {
        folderHandle =
            await window.showDirectoryPicker();
    }

    const newFileHandle =
        await folderHandle.getFileHandle(
            newName,
            { create: true }
        );

    const writable =
        await newFileHandle.createWritable();

    await writable.write(content);
    await writable.close();

    currentFileHandle = newFileHandle;
    currentFileName = title;
}

export async function loadTextFile() {
    const [fileHandle] =
        await window.showOpenFilePicker({
            types: [{
                description: "Text Files",
                accept: {
                    "text/plain": [".txt"]
                }
            }],
            multiple: false
        });

    currentFileHandle = fileHandle;

    const file = await fileHandle.getFile();
    const text = await file.text();

    currentFileName =
        file.name.replace(".txt", "");

    return {
        text,
        title: currentFileName
    };
}