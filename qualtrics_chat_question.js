Qualtrics.SurveyEngine.addOnReady(function () {
  const PROXY_URL = "https://qualtrics-chat-proxy.onrender.com/chat";
  const container = document.createElement("div");
  container.innerHTML = `
    <div id="ai-chat-log" style="border:1px solid #ccc; min-height:180px; padding:12px; margin-bottom:8px; overflow:auto;"></div>
    <textarea id="ai-chat-input" rows="3" style="width:100%;" placeholder="Ask for help choosing a prebiotic soda..."></textarea>
    <button type="button" id="ai-chat-send" style="margin-top:8px;">Send</button>
  `;
  this.getQuestionContainer().appendChild(container);

  const transcript = [];
  const log = container.querySelector("#ai-chat-log");
  const input = container.querySelector("#ai-chat-input");
  const button = container.querySelector("#ai-chat-send");

  function addMessage(role, text) {
    transcript.push({ role, text, timestamp: new Date().toISOString() });
    const div = document.createElement("div");
    div.style.marginBottom = "8px";
    div.textContent = `${role}: ${text}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    Qualtrics.SurveyEngine.setEmbeddedData("chat_transcript_json", JSON.stringify(transcript));
  }

  button.addEventListener("click", async function () {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage("participant", text);
    button.disabled = true;
    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: transcript })
      });
      const data = await res.json();
      addMessage("assistant", data.reply || "[No reply returned]");
    } catch (err) {
      addMessage("system", "The AI assistant is temporarily unavailable.");
    } finally {
      button.disabled = false;
    }
  });
});
