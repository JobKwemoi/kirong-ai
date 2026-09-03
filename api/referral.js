// ============================================================
// 👑 KIRONG AI — REFERRAL ENGINE V1
// Referral Codes + Tracking + Rewards
// ============================================================

"use strict";

import {
  getUser,
  getOrCreateUser,
  saveUser
} from "./users.js";

// ============================================================
// ⚙️ CONFIGURATION
// ============================================================

const REFERRAL_PREFIX = "KIRONG";

const REFERRAL_REWARD = 1;

// ============================================================
// 🔐 SAFE STRING
// ============================================================

function safeString(value) {
  return String(value || "")
    .trim();
}

// ============================================================
// 🔑 GENERATE REFERRAL CODE
// ============================================================

export function generateReferralCode(userId) {
  const id =
    safeString(userId)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

  const shortId =
    id.slice(-8) ||
    Math.random()
      .toString(36)
      .slice(2, 10)
      .toUpperCase();

  return `${REFERRAL_PREFIX}-${shortId}`;
}

// ============================================================
// 🔗 GET USER REFERRAL CODE
// ============================================================

export async function getReferralCode(userId) {
  const user =
    await getOrCreateUser(userId);

  if (!user.referralCode) {
    user.referralCode =
      generateReferralCode(
        user.userId
      );

    await saveUser(user);
  }

  return user.referralCode;
}

// ============================================================
// 🔎 FIND USER BY REFERRAL CODE
// ============================================================
//
// NOTE:
// Vercel Blob does not provide a simple "search all JSON users"
// operation through the current users.js abstraction.
//
// Therefore this function expects the referral owner to already
// be known, OR can be extended later with a dedicated index.
//
// ============================================================

export async function validateReferralCode(
  referralCode
) {
  const code =
    safeString(
      referralCode
    ).toUpperCase();

  if (!code) {
    return {
      valid: false,
      reason: "Referral code is required."
    };
  }

  if (
    !code.startsWith(
      `${REFERRAL_PREFIX}-`
    )
  ) {
    return {
      valid: false,
      reason: "Invalid referral code format."
    };
  }

  return {
    valid: true,
    code
  };
}

// ============================================================
// 🤝 APPLY REFERRAL
// ============================================================

export async function applyReferral(
  userId,
  referralOwnerId
) {
  const user =
    await getOrCreateUser(
      userId
    );

  const ownerId =
    safeString(
      referralOwnerId
    );

  // ----------------------------------------------------------
  // ❌ INVALID OWNER
  // ----------------------------------------------------------

  if (!ownerId) {
    return {
      success: false,
      reason: "Referral owner is required."
    };
  }

  // ----------------------------------------------------------
  // 🛑 SELF REFERRAL PROTECTION
  // ----------------------------------------------------------

  if (
    String(user.userId) ===
    String(ownerId)
  ) {
    return {
      success: false,
      reason: "You cannot refer yourself."
    };
  }

  // ----------------------------------------------------------
  // 🛑 USER ALREADY REFERRED
  // ----------------------------------------------------------

  if (user.referredBy) {
    return {
      success: false,
      reason: "User already has a referral."
    };
  }

  // ----------------------------------------------------------
  // GET REFERRAL OWNER
  // ----------------------------------------------------------

  const owner =
    await getUser(ownerId);

  if (!owner) {
    return {
      success: false,
      reason: "Referral owner not found."
    };
  }

  // ----------------------------------------------------------
  // 🛑 OWNER CANNOT REFER THEMSELVES
  // ----------------------------------------------------------

  if (
    String(owner.userId) ===
    String(user.userId)
  ) {
    return {
      success: false,
      reason: "Invalid referral."
    };
  }

  // ----------------------------------------------------------
  // INITIALIZE OWNER REFERRAL DATA
  // ----------------------------------------------------------

  if (
    typeof owner.referralCount !==
    "number"
  ) {
    owner.referralCount = 0;
  }

  if (!owner.referralCode) {
    owner.referralCode =
      generateReferralCode(
        owner.userId
      );
  }

  // ----------------------------------------------------------
  // 🔗 CONNECT USERS
  // ----------------------------------------------------------

  user.referredBy =
    owner.userId;

  // ----------------------------------------------------------
  // 🎁 REWARD REFERRAL OWNER
  // ----------------------------------------------------------

  owner.referralCount +=
    REFERRAL_REWARD;

  // ----------------------------------------------------------
  // 📊 OPTIONAL REFERRAL STATS
  // ----------------------------------------------------------

  if (
    !Array.isArray(
      owner.referrals
    )
  ) {
    owner.referrals = [];
  }

  owner.referrals.push({
    userId:
      user.userId,

    joinedAt:
      new Date().toISOString()
  });

  // ----------------------------------------------------------
  // 💾 SAVE BOTH USERS
  // ----------------------------------------------------------

  await saveUser(user);

  await saveUser(owner);

  // ----------------------------------------------------------
  // ✅ SUCCESS
  // ----------------------------------------------------------

  return {
    success: true,

    referralOwner:
      owner.userId,

    referredUser:
      user.userId,

    referralCount:
      owner.referralCount,

    reward:
      REFERRAL_REWARD
  };
}

// ============================================================
// 📊 GET REFERRAL STATS
// ============================================================

export async function getReferralStats(
  userId
) {
  const user =
    await getOrCreateUser(
      userId
    );

  if (!user.referralCode) {
    user.referralCode =
      generateReferralCode(
        user.userId
      );

    await saveUser(user);
  }

  return {
    userId:
      user.userId,

    referralCode:
      user.referralCode,

    referralCount:
      Number(
        user.referralCount || 0
      ),

    referredBy:
      user.referredBy || null,

    referrals:
      Array.isArray(
        user.referrals
      )
        ? user.referrals
        : []
  };
}

// ============================================================
// 🔗 BUILD REFERRAL LINK
// ============================================================

export function buildReferralLink(
  referralCode,
  baseUrl =
    "https://kirongjob.vercel.app"
) {
  const code =
    safeString(
      referralCode
    );

  if (!code) {
    return null;
  }

  return `${baseUrl}/?ref=${encodeURIComponent(code)}`;
}

// ============================================================
// 🎯 GET COMPLETE REFERRAL DATA
// ============================================================

export async function getReferralData(
  userId
) {
  const stats =
    await getReferralStats(
      userId
    );

  return {
    ...stats,

    referralLink:
      buildReferralLink(
        stats.referralCode
      )
  };
}

// ============================================================
// 👑 END REFERRAL ENGINE
// ============================================================
