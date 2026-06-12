# Stern Qualtrics Chat Proxy

Small Flask proxy for a Qualtrics live ChatGPT question. The proxy keeps
`OPENAI_API_KEY` on the server so the key is never exposed in Qualtrics
JavaScript.

## Deploy On Render

1. In Render, create a new Web Service from this GitHub repository.
2. Use these commands:

```bash
Build command: pip install -r requirements.txt
Start command: gunicorn server:app --bind 0.0.0.0:$PORT
```

3. Set environment variables in Render:

```bash
OPENAI_API_KEY=...
CHAT_PROVIDER=openai
OPENAI_MODEL=gpt-4.1-mini
CORS_ALLOW_ORIGIN=*
```

4. After deploy, test:

```bash
curl https://YOUR-APP.onrender.com/health

curl -X POST https://YOUR-APP.onrender.com/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"participant","text":"Help me choose a prebiotic soda."}]}'
```

## Attach To Qualtrics

1. Copy the deployed `/chat` URL, for example:

```text
https://YOUR-APP.onrender.com/chat
```

2. In `qualtrics_chat_question.js`, replace:

```javascript
const PROXY_URL = "https://YOUR-PROXY-HOST.example.com/chat";
```

with the deployed URL.

3. In Qualtrics, open survey `SV_5ua1qj5zzF4hONE`.
4. Open QID10 / `Q10_AI_CHAT`.
5. Open the question JavaScript editor.
6. Paste the entire configured JavaScript file.
7. Save, preview, send a test chat message, and republish.

## Local Test

```bash
python3 -m pip install -r requirements.txt
OPENAI_API_KEY=... python3 server.py
```

Then in another terminal:

```bash
curl -X POST http://127.0.0.1:8080/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"participant","text":"Help me choose a prebiotic soda."}]}'
```
