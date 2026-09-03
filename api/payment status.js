// ============================================================
// 👑 KIRONG AI — PAYMENT STATUS POLL V1
// The frontend polls this every few seconds after STK Push is
// sent, to find out once Safaricom's callback has landed.
// ============================================================

"use strict";

import { readTransaction } from "./payment.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kirong-User-Id");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const checkoutRequestId = req.query?.checkoutRequestId;

    if (!checkoutRequestId) {
      return res.status(400).json({ ok: false, error: "checkoutRequestId is required." });
    }

    const transaction = await readTransaction(checkoutRequestId);

    if (!transaction) {
      return res.status(404).json({ ok: false, error: "Transaction not found." });
    }

    return res.status(200).json({
      ok: true,
      status: transaction.status, // "pending" | "completed" | "failed"
      mpesaReceipt: transaction.mpesaReceipt || null,
      failureReason: transaction.failureReason || null
    });
  } catch (error) {
    console.error("KIRONG PAYMENT STATUS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Could not check payment status.",
      code: "PAYMENT_STATUS_ERROR"
    });
  }
}
