const API_KEY_STORAGE_KEY = "AINoteSheetOpenRouterApiKey";
const DEFAULT_API_KEY = "";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "google/gemma-3-4b-it";

function getStoredApiKey() {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY) || DEFAULT_API_KEY;
}

function setStoredApiKey(apiKey) {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

async function requestSummaryFromOpenRouter(apiKey, text) {
    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: [
                {
                    role: "user",
                    content:
                        "Summarize the following note clearly and concisely in 3-6 bullet points. Keep the wording simple and preserve important names, dates, numbers, and action items.\n\n" +
                        text
                }
            ],
            max_tokens: 256,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        let message = `OpenRouter request failed with status ${response.status}`;
        try {
            const errorBody = await response.json();
            if (errorBody?.error?.message) {
                message = errorBody.error.message;
            }
        } catch {
            // keep the default message
        }
        throw new Error(message);
    }

    const data = await response.json();
    const summaryText = data?.choices?.[0]?.message?.content?.trim();

    if (!summaryText) {
        throw new Error("OpenRouter returned an empty summary.");
    }

    return summaryText;
}

export function createSummaryController({
    summaryButton,
    summaryOverlay,
    summaryTitle,
    summaryBody,
    summaryCloseButton,
    summaryCopyButton,
    styleEditor
}) {
    function showSummary(text) {
        summaryTitle.textContent = "AI Summary";
        summaryBody.textContent = text;
        summaryOverlay.classList.remove("hidden");
        summaryOverlay.setAttribute("aria-hidden", "false");
    }

    function hideSummary() {
        summaryOverlay.classList.add("hidden");
        summaryOverlay.setAttribute("aria-hidden", "true");
    }

    async function summarizeCurrentNote() {
        const text = styleEditor.getCurrentText().trim();

        if (!text) {
            showSummary("Nothing to summarize yet.");
            return;
        }

        let apiKey = getStoredApiKey();

        if (!apiKey) {
            apiKey = window.prompt(
                "Paste your free OpenRouter API key from openrouter.ai",
                ""
            );

            if (!apiKey) return;

            apiKey = apiKey.trim();
            setStoredApiKey(apiKey);
        }

        summaryButton.disabled = true;
        summaryButton.textContent = "Summarizing...";
        showSummary("Generating summary...");

        try {
            const summary = await requestSummaryFromOpenRouter(apiKey, text);
            showSummary(summary);
        } catch (error) {
            showSummary(`Could not generate a summary. ${error.message}`);
        } finally {
            summaryButton.disabled = false;
            summaryButton.textContent = "Summarize";
        }
    }

    function initialize() {
        summaryButton.addEventListener("click", summarizeCurrentNote);

        summaryCloseButton.addEventListener("click", hideSummary);

        summaryCopyButton.addEventListener("click", async () => {
            await navigator.clipboard.writeText(summaryBody.textContent || "");
        });

        summaryOverlay.addEventListener("click", (event) => {
            if (event.target === summaryOverlay) {
                hideSummary();
            }
        });
    }

    return { initialize, hideSummary, summarizeCurrentNote };
}