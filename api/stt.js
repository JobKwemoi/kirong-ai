// ============================================================
// 👑 KIRONG AI — SPEECH-TO-TEXT ENGINE V1 (Whisper via Hugging Face)
// Fallback voice input for browsers with no native SpeechRecognition
// (e.g. desktop Firefox) — records audio, transcribes server-side.
// ============================================================

"use strict";

const HUGGINGFACE_KEYS = parseKeys(
  process.env.HUGGINGFACE_API_KEYS ||
  process.env.HUGGINGFACE_API_KEY
);

const STT_MODEL = process.env.HUGGINGFACE_STT_MODEL || "openai/whisper-large-v3-turbo";

// Vercel Hobby caps request bodies around 4.5MB. Base64 inflates
// bytes by ~33%, so we cap the raw audio well under that so the
// encoded JSON payload never gets rejected before we even see it.
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

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
        error: "Voice input isn't configured yet.",
        code: "STT_NOT_CONFIGURED"
      });
    }

    const body = req.body || {};
    const rawAudio = body.audio;
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "audio/webm";

    if (!rawAudio) {
      return res.status(400).json({ ok: false, error: "No audio provided." });
    }

    const base64Data = String(rawAudio).replace(/^data:[^;]+;base64,/, "");
    const audioBuffer = Buffer.from(base64Data, "base64");

    if (audioBuffer.length === 0) {
      return res.status(400).json({ ok: false, error: "Empty recording." });
    }

    if (audioBuffer.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({
        ok: false,
        error: "Recording too long — keep voice messages short (a few seconds)."
      });
    }

    const key = rotateKey(HUGGINGFACE_KEYS, Math.floor(Math.random() * HUGGINGFACE_KEYS.length));

    let response;
    try {
      response = await fetchWithTimeout(
        `https://api-inference.huggingface.co/models/${STT_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": mimeType
          },
          body: audioBuffer
        }
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        return res.status(504).json({
          ok: false,
          error: "Transcription took too long (model may be cold-starting). Try again.",
          code: "STT_TIMEOUT"
        });
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face STT ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json().catch(() => ({}));
    const text = typeof data?.text === "string" ? data.text.trim() : "";

    return res.status(200).json({
      ok: true,
      text,
      note: text ? null : "No speech detected."
    });
  } catch (error) {
    console.error("KIRONG STT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Voice transcription is temporarily unavailable.",
      code: "STT_SERVER_ERROR"
    });
  }
}

