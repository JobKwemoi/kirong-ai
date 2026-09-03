// ============================================================
// 👑 KIRONG AI — M-PESA STK PUSH ENGINE V1
// Initiates "Lipa na M-Pesa" payments via Safaricom Daraja API
// ============================================================

"use strict";

import { put, get } from "@vercel/blob";
import { PRO_PRICE_KES } from "../plans.js";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PAYMENT_PREFIX = "kirong-ai/payments/";

// ------------------------------------------------------------
// Toggle sandbox <-> production purely via env vars — no code
// changes needed once you have real Paybill/Till credentials.
// ------------------------------------------------------------

const MPESA_ENV =
  (process.env.MPESA_ENV || "sandbox").toLowerCase();

const BASE_URL =
  MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const PASSKEY = process.env.MPESA_PASSKEY;

// Safaricom's own sandbox test Paybill — safe default so sandbox
// testing works even before you've created your own test app.
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";

// Must be a public HTTPS URL Safaricom can reach — e.g.
// https://kirongjob.vercel.app/api/payment-callback
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

function requireConfig() {
  const missing = [];

  if (!CONSUMER_KEY) missing.push("MPESA_CONSUMER_KEY");
  if (!CONSUMER_SECRET) missing.push("MPESA_CONSUMER_SECRET");
  if (!PASSKEY) missing.push("MPESA_PASSKEY");
  if (!CALLBACK_URL) missing.push("MPESA_CALLBACK_URL");
  if (!TOKEN) missing.push("BLOB_READ_WRITE_TOKEN");

  if (missing.length) {
    throw new Error(
      `M-Pesa isn't configured yet — missing: ${missing.join(", ")}`
    );
  }
}

// ============================================================
// 📞 PHONE NUMBER NORMALIZATION (Kenyan formats -> 2547XXXXXXXX)
// ============================================================

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  if (digits.startsWith("1") && digits.length === 9) return "254" + digits;

  return null; // invalid
}

// ============================================================
// 🔑 OAUTH TOKEN
// ============================================================

async function getAccessToken() {
  const credentials = Buffer.from(
    `${CONSUMER_KEY}:${CONSUMER_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`M-Pesa auth failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("M-Pesa auth did not return an access token.");
  }

  return data.access_token;
}

// ============================================================
// ⏱️ TIMESTAMP + PASSWORD (Daraja's required format)
// ============================================================

function buildTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function buildPassword(timestamp) {
  return Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");
}

// ============================================================
// 💾 TRANSACTION STORAGE (Vercel Blob, private)
// ============================================================

function transactionPath(checkoutRequestId) {
  return `${PAYMENT_PREFIX}${checkoutRequestId}.json`;
}

async function saveTransaction(record) {
  await put(
    transactionPath(record.checkoutRequestId),
    JSON.stringify(record, null, 2),
    {
      token: TOKEN,
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true
    }
  );
}

// (Exported so payment-status.js / payment-callback.js can reuse
// the exact same read logic — kept here to avoid duplicating the
// BlobNotFoundError handling we already had to fix once before.)
export async function readTransaction(checkoutRequestId) {
  try {
    const result = await get(transactionPath(checkoutRequestId), {
      token: TOKEN,
      access: "private",
      useCache: false
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    const text = await new Response(result.stream).text();

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();

    if (
      error?.name === "BlobNotFoundError" ||
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("404")
    ) {
      return null;
    }

    throw error;
  }
}

export { saveTransaction, transactionPath, SHORTCODE };

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
// 🚀 MAIN HANDLER — initiates the STK Push
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
    requireConfig();

    const body = req.body || {};
    const userId = String(body.userId || req.headers["x-kirong-user-id"] || "anonymous").trim().slice(0, 100);
    const phone = normalizePhone(body.phone);

    if (!phone) {
      return res.status(400).json({
        ok: false,
        error: "Enter a valid Safaricom number, e.g. 07XXXXXXXX."
      });
    }

    const amount = Math.max(1, Math.round(Number(body.amount) || PRO_PRICE_KES));

    const accessToken = await getAccessToken();
    const timestamp = buildTimestamp();
    const password = buildPassword(timestamp);

    const stkResponse = await fetch(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: CALLBACK_URL,
          AccountReference: "Kirong AI Pro",
          TransactionDesc: "Kirong AI Pro subscription"
        })
      }
    );

    const stkData = await stkResponse.json().catch(() => ({}));

    if (!stkResponse.ok || stkData.ResponseCode !== "0") {
      const reason =
        stkData.errorMessage ||
        stkData.ResponseDescription ||
        `M-Pesa rejected the request (${stkResponse.status}).`;

      throw new Error(reason);
    }

    // Save a "pending" record so the callback (and the status-poll
    // endpoint) can find this transaction later by CheckoutRequestID.
    await saveTransaction({
      checkoutRequestId: stkData.CheckoutRequestID,
      merchantRequestId: stkData.MerchantRequestID,
      userId,
      phone,
      amount,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      ok: true,
      checkoutRequestId: stkData.CheckoutRequestID,
      message: "Check your phone and enter your M-Pesa PIN to complete payment."
    });
  } catch (error) {
    console.error("KIRONG PAYMENT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Payment could not be started. Please try again.",
      code: "PAYMENT_SERVER_ERROR"
    });
  }
}
