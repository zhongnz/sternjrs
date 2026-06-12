Qualtrics.SurveyEngine.addOnReady(function () {
  const PROXY_URL = "https://qualtrics-chat-proxy.onrender.com/chat";
  const question = this;
  const root = question.getQuestionContainer();

  const container = document.createElement("div");
  container.setAttribute("data-ai-chat", "true");
  container.style.maxWidth = "760px";
  container.style.marginTop = "12px";
  container.innerHTML = `
    <div id="ai-chat-log" style="border:1px solid #b8c2cc; min-height:180px; max-height:320px; padding:12px; margin-bottom:10px; overflow:auto; background:#fff; border-radius:6px;"></div>
    <label for="ai-chat-input" style="display:block; font-weight:600; margin-bottom:6px;">Ask for help choosing a prebiotic soda</label>
    <textarea id="ai-chat-input" rows="3" style="box-sizing:border-box; width:100%; padding:10px; border:1px solid #9aa5b1; border-radius:6px;" placeholder="For example: I want something lower sugar that still tastes like cola."></textarea>
    <div style="display:flex; gap:10px; align-items:center; margin-top:8px;">
      <button type="button" id="ai-chat-send" style="padding:8px 14px; border:1px solid #4b5563; border-radius:6px; background:#1f2937; color:white; cursor:pointer;">Send</button>
      <span id="ai-chat-status" aria-live="polite" style="color:#4b5563;"></span>
    </div>
  `;
  root.appendChild(container);

  const transcript = [];
  const log = container.querySelector("#ai-chat-log");
  const input = container.querySelector("#ai-chat-input");
  const button = container.querySelector("#ai-chat-send");
  const status = container.querySelector("#ai-chat-status");

  function setStatus(text) {
    status.textContent = text || "";
  }

  function storeTranscript() {
    Qualtrics.SurveyEngine.setEmbeddedData("chat_transcript_json", JSON.stringify(transcript));
  }

  function addMessage(role, text) {
    const cleanRole = role || "system";
    const cleanText = text || "[empty message]";
    transcript.push({ role: cleanRole, text: cleanText, timestamp: new Date().toISOString() });

    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.style.lineHeight = "1.35";
    const label = document.createElement("strong");
    label.textContent = cleanRole === "participant" ? "You: " : cleanRole === "assistant" ? "Assistant: " : "System: ";
    const body = document.createElement("span");
    body.textContent = cleanText;
    div.appendChild(label);
    div.appendChild(body);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    storeTranscript();
  }

  async function sendMessage(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const text = input.value.trim();
    if (!text || button.disabled) return;

    input.value = "";
    addMessage("participant", text);
    button.disabled = true;
    setStatus("Thinking...");

    const controller = new AbortController();
    const timeout = setTimeout(function () {
      controller.abort();
    }, 30000);

    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: transcript }),
        signal: controller.signal
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        throw new Error("Proxy returned non-JSON response: " + raw.slice(0, 120));
      }
      if (!res.ok) {
        throw new Error(data.error || "Proxy returned HTTP " + res.status);
      }
      addMessage("assistant", data.reply || "[No reply returned]");
      setStatus("");
    } catch (err) {
      console.error("Qualtrics AI chat error", err);
      addMessage("system", "The AI assistant could not respond. Please wait a moment and try again.");
      setStatus("Connection error");
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
      input.focus();
    }
  }

  button.addEventListener("click", sendMessage);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      sendMessage(event);
    }
  });

  addMessage("assistant", "Hi, I can help compare OLIPOP, poppi, and Simply Pop. Tell me what matters most: taste, sugar, ingredients, price, or health claims.");
});
