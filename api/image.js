// ============================================================
// 👑 KIRONG AI — IMAGE GENERATION ENGINE V3
// Pollinations.ai (instant, primary) + Hugging Face (timeout-safe fallback)
// ============================================================

"use strict";

const HUGGINGFACE_KEYS = parseKeys(
  process.env.HUGGINGFACE_API_KEYS ||
  process.env.HUGGINGFACE_API_KEY
);

// Fast, free-tier-friendly model. Override with an env var if you
// prefer a different Hugging Face text-to-image model.
const HF_MODEL =
  process.env.HUGGINGFACE_IMAGE_MODEL ||
  "black-forest-labs/FLUX.1-schnell";

const MAX_PROMPT_LENGTH = 600;

// ------------------------------------------------------------
// IMPORTANT — Vercel Hobby (free) plan hard-caps serverless
// functions at 10 seconds, REGARDLESS of what maxDuration says.
// maxDuration: 10 here just documents that ceiling; if you're on
// Vercel Pro, you can raise this (e.g. 30) AND raise
// PROVIDER_TIMEOUT_MS below to match. On Hobby, leave both as-is.
// ------------------------------------------------------------
export const config = {
  maxDuration: 10
};

// Must stay comfortably UNDER the platform's hard timeout, so our
// own clean JSON error fires before Vercel kills the function and
// returns its own non-JSON crash response (the "[object Object]" bug).
const PROVIDER_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// 🧩 PARSE MULTIPLE API KEYS (same pattern as chat.js)
// ============================================================

function parseKeys(value) {
  if (!value) return [];
  return String(value)
    .split(/[\n,]+/)
    .map(key => key.trim())
    .filter(Boolean);
}

function rotateKey(keys, index) {
  if (!keys.length) return null;
  return keys[index % keys.length];
}

// ============================================================
// 🧹 CLEAN PROMPT
// ============================================================

function cleanPrompt(prompt) {
  if (typeof prompt !== "string") return "";
  return prompt.trim().slice(0, MAX_PROMPT_LENGTH);
}

// ============================================================
// 👤 GET USER ID (kept for future Pro-gating in Phase 4 —
// not enforced yet, so this endpoint doesn't touch users.js)
// ============================================================

function getUserId(req, body) {
  const fromBody = body?.userId;
  const fromHeader = req.headers["x-kirong-user-id"];
  const id = fromBody || fromHeader || "anonymous";
  return String(id).trim().slice(0, 100);
}

// ============================================================
// 🎨 PROVIDER 1: POLLINATIONS.AI (free, no key, near-instant)
// ============================================================
// We do NOT verify this URL with a fetch here — building it is
// synchronous and costs ~0ms of function time, which is exactly
// what we want given the 10s platform ceiling. If the URL turns
// out to be broken, the frontend <img> element's onerror handler
// catches that gracefully instead of the whole request failing.
// ============================================================

function tryPollinations(prompt) {
  const seed = Math.floor(Math.random() * 1000000);

  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1024&height=1024&seed=${seed}&nologo=true`;

  return { provider: "pollinations", image: url };
}

// ============================================================
// 🎨 PROVIDER 2: HUGGING FACE INFERENCE API (fallback)
// ============================================================

async function tryHuggingFace(prompt) {
  if (!HUGGINGFACE_KEYS.length) {
    throw new Error("Hugging Face unavailable.");
  }

  const key = rotateKey(
    HUGGINGFACE_KEYS,
    Math.floor(Math.random() * HUGGINGFACE_KEYS.length)
  );

  let response;

  try {
    response = await fetchWithTimeout(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Hugging Face took too long to respond (likely a cold-start model load).");
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.startsWith("image/")) {
    // HF sometimes returns 200 with a JSON error (e.g. "model is loading")
    const text = await response.text();
    throw new Error(`Hugging Face did not return an image: ${text.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUrl = `data:${contentType};base64,${base64}`;

  return { provider: "huggingface", image: dataUrl };
}

// ============================================================
// 🌐 CORS
// ============================================================

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kirong-User-Id");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

// ============================================================
// 🚀 MAIN HANDLER
// ============================================================

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const body = req.body || {};
    const prompt = cleanPrompt(body.prompt);

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "Describe what image you want."
      });
    }

    const userId = getUserId(req, body);
    void userId; // reserved for Phase 4 Pro-gating

    // Pollinations first — synchronous, essentially free in function time.
    let result = tryPollinations(prompt);

    // If you ever want to force Hugging Face instead/also, this is
    // where a fallback attempt would go. Kept simple + fast for now:
    // Pollinations practically never fails in a way we can detect
    // server-side without spending time we don't have on Hobby plan.

    return res.status(200).json({
      ok: true,
      type: "image",
      image: result.image,
      provider: result.provider,
      prompt,
      text: "🎨 Here's your image!"
    });
  } catch (error) {
    console.error("KIRONG IMAGE ERROR:", error);

    return res.status(500).json({
      ok: false,
      type: "error",
      error: "Image generation is temporarily unavailable.",
      text: "Image generation is temporarily unavailable.",
      code: "IMAGE_SERVER_ERROR"
    });
  }
}
