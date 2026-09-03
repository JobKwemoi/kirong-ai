// ============================================================
// 👑 KIRONG AI — HD VOICE (TEXT-TO-SPEECH) ENGINE V1
// Hugging Face Inference API — replaces spotty browser TTS,
// especially for Swahili where many devices have no native voice.
// ============================================================

"use strict";

const HUGGINGFACE_KEYS = parseKeys(
  process.env.HUGGINGFACE_API_KEYS ||
  process.env.HUGGINGFACE_API_KEY
);

// Meta's MMS-TTS family has solid per-language models, including
// Swahili — this is exactly the gap browser TTS voices had.
const TTS_MODEL_SW = process.env.HUGGINGFACE_TTS_MODEL_SW || "facebook/mms-tts-swa";
const TTS_MODEL_EN = process.env.HUGGINGFACE_TTS_MODEL_EN || "facebook/mms-tts-eng";

const MAX_TEXT_LENGTH = 600;

// Same safety pattern as image.js: Vercel Hobby hard-caps functions
// at 10s regardless of maxDuration, so our own timeout must stay
// comfortably under that to fail cleanly instead of crashing.
export const config = { maxDuration: 10 };
const PROVIDER_TIMEOUT_MS = 8000;

function parseKeys(value) {
  if (!value) return [];
  return String(value).split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
}

function rotateKey(keys, index) {
  if (!keys.length) return null;
  return keys[index % keys.length];
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function cleanText(text) {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, MAX_TEXT_LENGTH);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kirong-User-Id");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    if (!HUGGINGFACE_KEYS.length) {
      return res.status(503).json({
        ok: false,
        error: "HD voice isn't configured yet.",
        code: "TTS_NOT_CONFIGURED"
      });
    }

    const body = req.body || {};
    const text = cleanText(body.text);
    const lang = body.lang === "sw" ? "sw" : "en";

    if (!text) {
      return res.status(400).json({ ok: false, error: "No text to speak." });
    }

    const model = lang === "sw" ? TTS_MODEL_SW : TTS_MODEL_EN;
    const key = rotateKey(HUGGINGFACE_KEYS, Math.floor(Math.random() * HUGGINGFACE_KEYS.length));

    let response;
    try {
      response = await fetchWithTimeout(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ inputs: text })
        }
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        return res.status(504).json({
          ok: false,
          error: "Voice generation took too long (model may be cold-starting). Try again in a moment.",
          code: "TTS_TIMEOUT"
        });
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face TTS ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.startsWith("audio/")) {
      const text2 = await response.text();
      throw new Error(`Hugging Face TTS did not return audio: ${text2.slice(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return res.status(200).json({ ok: true, audio: dataUrl });
  } catch (error) {
    console.error("KIRONG TTS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Voice generation is temporarily unavailable.",
      code: "TTS_SERVER_ERROR"
    });
  }
}
