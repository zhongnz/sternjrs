#!/usr/bin/env python3
"""Minimal HTTPS-deployable proxy for the Qualtrics live chat question.

The proxy uses OpenAI by default for the Qualtrics "ChatGPT" requirement. It
can still use Anthropic if CHAT_PROVIDER=anthropic is set.
"""

from __future__ import annotations

import os

import requests
from flask import Flask, jsonify, request


app = Flask(__name__)


SYSTEM_PROMPT = (
    "You are a concise shopping assistant in an academic survey. Help the "
    "participant compare prebiotic sodas using taste, ingredients, price, and "
    "health-claim caution. Do not ask for sensitive personal data."
)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = os.environ.get("CORS_ALLOW_ORIGIN", "*")
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.get("/")
def index():
    return jsonify(
        {
            "ok": True,
            "service": "qualtrics-chat-proxy",
            "health": "/health",
            "chat": "/chat",
        }
    )


@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return ("", 204)

    provider = os.environ.get("CHAT_PROVIDER", "openai").lower()
    incoming = request.get_json(force=True).get("messages", [])
    text = "\n".join(f"{m.get('role')}: {m.get('text')}" for m in incoming[-8:])

    if provider == "anthropic":
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            return jsonify({"error": "ANTHROPIC_API_KEY missing"}), 500
        payload = {
            "model": os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
            "max_tokens": 500,
            "temperature": 0.4,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": text}],
        }
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )
        body = r.json()
        reply = "\n".join(
            part.get("text", "")
            for part in body.get("content", [])
            if isinstance(part, dict) and part.get("type") == "text"
        ).strip()
        return jsonify({"reply": reply, "raw": body}), r.status_code

    if provider != "openai":
        return jsonify({"error": f"Unsupported CHAT_PROVIDER: {provider}"}), 400

    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return jsonify({"error": "OPENAI_API_KEY missing"}), 500
    payload = {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        "temperature": 0.4,
    }
    r = requests.post(
        "https://api.openai.com/v1/responses",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    body = r.json()
    reply = body.get("output_text")
    if not reply:
        parts = []
        for item in body.get("output", []) or []:
            for content in item.get("content", []) or []:
                if content.get("type") in ("output_text", "text"):
                    parts.append(content.get("text", ""))
        reply = "\n".join(parts).strip()
    return jsonify({"reply": reply, "raw": body}), r.status_code


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
