document.addEventListener("DOMContentLoaded", () => {
  // --- UI Elements ---
  const codeDisplay = document.getElementById("code-display");
  const explainBtn = document.getElementById("explain-btn");
  const customPrompt = document.getElementById("custom-prompt");

  // UI State for Explainer
  const uiStateContainer = document.getElementById("ui-state-container");
  const placeholder = document.getElementById("placeholder");
  const loader = document.getElementById("loader");
  const explanationContent = document.getElementById("explanation-content");

  // Tabs and Views
  const tabExplainer = document.getElementById("tab-explainer");
  const tabHistory = document.getElementById("tab-history");
  const explainerView = document.getElementById("explainer-view");
  const historyView = document.getElementById("history-view");

  // History Elements
  const historyList = document.getElementById("history-list");
  const noHistoryMessage = document.getElementById("no-history-message");
  const clearHistoryBtn = document.getElementById("clear-history-btn");

  let selectedCode = "";
  const defaultPrompt = `Your task is to explain a code snippet. Start with a one-sentence summary prefixed with "Summary:". Then, provide a more detailed, step-by-step explanation of the code. Format your response using Markdown. Here is the code:\n\n\`\`\`\n{{CODE}}\n\`\`\``;

  // --- Functions ---

  const setUIState = (state) => {
    placeholder.classList.add("hidden");
    loader.classList.add("hidden");
    explanationContent.classList.add("hidden");
    if (state === "loading") loader.classList.remove("hidden");
    else if (state === "content") explanationContent.classList.remove("hidden");
    else placeholder.classList.remove("hidden");
  };

  const renderMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/^\s*[\-\*]\s(.*)/gm, "<ul><li>$1</li></ul>")
      .replace(/<\/ul>\n<ul>/g, "")
      .replace(/^\s*\d\.\s(.*)/gm, "<ol><li>$1</li></ol>")
      .replace(/<\/ol>\n<ol>/g, "")
      .replace(/\n/g, "<br>");
  };

  const loadHistory = () => {
    chrome.storage.local.get({ history: [] }, (data) => {
      historyList.innerHTML = "";
      const history = data.history;
      if (history.length === 0) {
        noHistoryMessage.classList.remove("hidden");
        clearHistoryBtn.disabled = true;
      } else {
        noHistoryMessage.classList.add("hidden");
        clearHistoryBtn.disabled = false;
        history.forEach((item) => {
          const historyItem = document.createElement("div");
          historyItem.className =
            "p-4 bg-white border border-gray-200 rounded-lg shadow-sm";
          historyItem.innerHTML = `
                        <div class="mb-2">
                            <p class="text-xs text-gray-500">${new Date(
                              item.date
                            ).toLocaleString()}</p>
                            <div class="mt-1 bg-gray-800 text-white p-2 rounded-md max-h-24 overflow-y-auto">
                                <pre class="text-xs font-mono whitespace-pre-wrap"><code>${item.code
                                  .replace(/</g, "&lt;")
                                  .replace(/>/g, "&gt;")}</code></pre>
                            </div>
                        </div>
                        <div class="markdown-content text-sm">${renderMarkdown(
                          item.explanation
                        )}</div>
                    `;
          historyList.appendChild(historyItem);
        });
      }
    });
  };

  const saveToHistory = (code, explanation) => {
    const historyEntry = {
      id: `hist_${Date.now()}`,
      code: code,
      explanation: explanation,
      date: new Date().toISOString(),
    };
    chrome.storage.local.get({ history: [] }, (data) => {
      const history = data.history;
      history.unshift(historyEntry); // Add to the beginning
      if (history.length > 50) history.pop(); // Limit history to 50 items
      chrome.storage.local.set({ history });
    });
  };

  // --- Event Listeners ---

  // Tab Switching
  tabExplainer.addEventListener("click", () => {
    explainerView.classList.remove("hidden");
    historyView.classList.add("hidden");
    tabExplainer.classList.add("active");
    tabHistory.classList.remove("active");
  });

  tabHistory.addEventListener("click", () => {
    historyView.classList.remove("hidden");
    explainerView.classList.add("hidden");
    tabHistory.classList.add("active");
    tabExplainer.classList.remove("active");
    loadHistory();
  });

  // Clear History
  clearHistoryBtn.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to clear all history? This cannot be undone."
      )
    ) {
      chrome.storage.local.set({ history: [] }, () => {
        loadHistory();
      });
    }
  });

  // Explain Button Click
  explainBtn.addEventListener("click", async () => {
    if (!selectedCode) return;

    setUIState("loading");
    explainBtn.disabled = true;
    explanationContent.innerHTML = "";

    try {
      const userPrompt = customPrompt.value.replace("{{CODE}}", selectedCode);
      const payload = {
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      };
      const apiKey = "YOU_API_KEY"; // IMPORTANT: Replace with your actual API key
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok)
        throw new Error(`API Error: ${response.status} ${response.statusText}`);

      const result = await response.json();
      const rawText = result.candidates[0].content.parts[0].text;

      explanationContent.innerHTML = renderMarkdown(rawText);
      saveToHistory(selectedCode, rawText);
      setUIState("content");
    } catch (error) {
      console.error("Error fetching explanation:", error);
      explanationContent.innerHTML = `<div class="text-red-600"><strong>Error:</strong> ${error.message}</div>`;
      setUIState("content");
    } finally {
      explainBtn.disabled = false;
    }
  });

  // --- Initialization ---

  // Set default prompt and retrieve selected code
  customPrompt.value = defaultPrompt;
  chrome.storage.local.get(["selectedCode"], (result) => {
    if (result.selectedCode) {
      selectedCode = result.selectedCode;
      codeDisplay.textContent = selectedCode;
      explainBtn.disabled = false;
      chrome.storage.local.remove("selectedCode");
    } else {
      explainBtn.disabled = true;
    }
    setUIState("placeholder");
  });
});
