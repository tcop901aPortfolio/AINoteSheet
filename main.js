import {
    saveTextFile
} from "./fileManager.js";

import {
    createStyleEditor
} from "./styleEditor.js";

import {
    createFileBrowserController
} from "./fileBrowser.js";

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

const startupOverlay =
    document.getElementById(
        "startupOverlay"
    );

const startupSelectFolderButton =
    document.getElementById(
        "startupSelectFolderButton"
    );

const fileBrowser =
    document.getElementById(
        "fileBrowser"
    );

const folderName =
    document.getElementById(
        "folderName"
    );

const fileList =
    document.getElementById(
        "fileList"
    );

const browserSelectFolderButton =
    document.getElementById(
        "browserSelectFolderButton"
    );

const refreshFilesButton =
    document.getElementById(
        "refreshFilesButton"
    );

const newFileButton =
    document.getElementById(
        "newFileButton"
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

const styleEditor =
    createStyleEditor(
        {
            editor,
            statusDot,
            wordCount,
            titleInput,
            colorSelect,
            boldButton,
            italicButton,
            resetStyleButton
        }
    );

const fileBrowserController =
    createFileBrowserController(
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
    );

styleEditor.initialize();
fileBrowserController.initialize();

saveButton.addEventListener(
    "click",
    async () => {
        await saveTextFile(
            styleEditor.getCurrentTitle(),
            styleEditor.getCurrentDocumentData()
        );

        styleEditor.setStatus(
            "saved"
        );

        await fileBrowserController.refreshFolderBrowser();
    }
);

fileBrowserController.bootstrapFolderBrowser();
