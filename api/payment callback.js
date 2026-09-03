// ============================================================
// 👑 KIRONG AI — M-PESA CALLBACK HANDLER V1
// Safaricom calls THIS endpoint after the user enters their PIN
// (or cancels/fails). Never called by the frontend directly.
// ============================================================

"use strict";

import { readTransaction, saveTransaction } from "./payment.js";
import { getOrCreateUser, saveUser } from "../users.js";
import { activateProSubscription } from "../plans.js";

function setCors(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const callback = req.body?.Body?.stkCallback;

    if (!callback) {
      // Safaricom expects a 200 even on malformed input, or it will
      // keep retrying the callback indefinitely.
      console.error("KIRONG PAYMENT CALLBACK: malformed body", JSON.stringify(req.body));
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;

    const transaction = await readTransaction(checkoutRequestId);

    if (!transaction) {
      console.error("KIRONG PAYMENT CALLBACK: unknown CheckoutRequestID", checkoutRequestId);
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (resultCode === 0) {
      // ---- SUCCESS ----
      const metadata = {};

      (callback.CallbackMetadata?.Item || []).forEach((item) => {
        metadata[item.Name] = item.Value;
      });

      transaction.status = "completed";
      transaction.mpesaReceipt = metadata.MpesaReceiptNumber || null;
      transaction.paidAmount = metadata.Amount || transaction.amount;
      transaction.transactionDate = metadata.TransactionDate || null;
      transaction.updatedAt = new Date().toISOString();

      await saveTransaction(transaction);

      // Activate Pro for the user tied to this transaction.
      const user = await getOrCreateUser(transaction.userId);
      activateProSubscription(user, { paymentRef: transaction.mpesaReceipt });
      await saveUser(user);
    } else {
      // ---- CANCELLED / FAILED ----
      transaction.status = "failed";
      transaction.failureReason = resultDesc || "Payment was not completed.";
      transaction.updatedAt = new Date().toISOString();

      await saveTransaction(transaction);
    }

    // Safaricom just needs a 200 acknowledging receipt.
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("KIRONG PAYMENT CALLBACK ERROR:", error);

    // Still acknowledge with 200 — Safaricom will keep retrying
    // otherwise, and our own logs already captured the problem.
    return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}

