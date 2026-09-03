// ============================================================
// 👑 KIRONG AI — PLANS ENGINE V16
// ------------------------------------------------------------
// Central plan + usage engine for Kirong AI.
//
// Exports:
//   PLANS
//   createDefaultUser()
//   normalizePlan()
//   resetDailyUsageIfNeeded()
//   getUserPlan()
//   checkUsageLimit()
//   checkTokenLimit()
//   recordUsage()
//   getUsageSnapshot()
//   canUseFeature()
//
// Compatible with:
//   users.js V15
//   chat.js V13
//   referral/payment logic
// ============================================================

"use strict";

// ============================================================
// ⚙️ PLAN DEFINITIONS
// ============================================================

const PLANS = {
  free: {
    id: "free",
    label: "Free",

    messagesPerDay: 30,
    imagesPerDay: 3,
    tokensPerDay: 60000,

    maxInputTokens: 6000,
    maxOutputTokens: 1024,

    features: {
      contentFactory: false,
      whatsappBusiness: false,
      blogEngine: false,
      affiliateEngine: false
    }
  },

  pro: {
    id: "pro",
    label: "Pro",

    messagesPerDay: 300,
    imagesPerDay: 50,
    tokensPerDay: 1000000,

    maxInputTokens: 16000,
    maxOutputTokens: 4096,

    features: {
      contentFactory: true,
      whatsappBusiness: true,
      blogEngine: true,
      affiliateEngine: true
    }
  }
};

// ============================================================
// 📅 TODAY KEY
// ============================================================

function todayKey() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

// ============================================================
// 🧱 DEFAULT USAGE
// ============================================================

function createDefaultUsage() {
  return {
    date:
      todayKey(),

    messages: 0,

    images: 0,

    tokens: 0
  };
}

// ============================================================
// 🆕 CREATE DEFAULT USER
// ============================================================

function createDefaultUser(
  userId
) {
  const id =
    String(
      userId ||
      "anonymous"
    ).trim();

  const now =
    new Date().toISOString();

  return {
    userId:
      id,

    id:
      id,

    plan:
      "free",

    usage:
      createDefaultUsage(),

    referredBy:
      null,

    referralCount:
      0,

    proTrialUntil:
      null,

    createdAt:
      now,

    updatedAt:
      now
  };
}

// ============================================================
// 🔧 NORMALIZE PLAN
// ------------------------------------------------------------
// Returns:
//   "free"
//   "pro"
// ============================================================

function normalizePlan(
  user
) {
  if (
    !user ||
    typeof user !== "object"
  ) {
    return "free";
  }

  const rawPlan =
    String(
      user.plan ||
      "free"
    )
      .trim()
      .toLowerCase();

  if (
    rawPlan === "pro"
  ) {
    user.plan =
      "pro";

    return "pro";
  }

  user.plan =
    "free";

  return "free";
}

// ============================================================
// 🔄 RESET DAILY USAGE
// ============================================================

function resetDailyUsageIfNeeded(
  user
) {
  if (
    !user ||
    typeof user !== "object"
  ) {
    throw new Error(
      "plans.js: expected a user object."
    );
  }

  // ----------------------------------------------------------
  // CREATE USAGE IF MISSING
  // ----------------------------------------------------------

  if (
    !user.usage ||
    typeof user.usage !== "object"
  ) {
    user.usage =
      createDefaultUsage();

    return user;
  }

  const today =
    todayKey();

  // ----------------------------------------------------------
  // RESET WHEN DAY CHANGES
  // ----------------------------------------------------------

  if (
    user.usage.date !==
    today
  ) {
    user.usage = {
      date:
        today,

      messages:
        0,

      images:
        0,

      tokens:
        0
    };
  }

  // ----------------------------------------------------------
  // SANITIZE COUNTERS
  // ----------------------------------------------------------

  user.usage.messages =
    Math.max(
      0,
      Number(
        user.usage.messages
      ) || 0
    );

  user.usage.images =
    Math.max(
      0,
      Number(
        user.usage.images
      ) || 0
    );

  user.usage.tokens =
    Math.max(
      0,
      Number(
        user.usage.tokens
      ) || 0
    );

  return user;
}

// ============================================================
// 🧱 ENSURE USER SHAPE
// ============================================================

function ensureUserShape(
  user
) {
  if (
    !user ||
    typeof user !== "object"
  ) {
    throw new Error(
      "plans.js: expected a user object."
    );
  }

  resetDailyUsageIfNeeded(
    user
  );

  normalizePlan(
    user
  );

  // ----------------------------------------------------------
  // ID
  // ----------------------------------------------------------

  if (
    !user.userId &&
    user.id
  ) {
    user.userId =
      String(user.id);
  }

  if (
    !user.id &&
    user.userId
  ) {
    user.id =
      String(user.userId);
  }

  // ----------------------------------------------------------
  // REFERRAL DATA
  // ----------------------------------------------------------

  if (
    !Object.prototype.hasOwnProperty.call(
      user,
      "referredBy"
    )
  ) {
    user.referredBy =
      null;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      user,
      "referralCount"
    )
  ) {
    user.referralCount =
      0;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      user,
      "proTrialUntil"
    )
  ) {
    user.proTrialUntil =
      null;
  }

  return user;
}

// ============================================================
// 👑 PRO TRIAL CHECK
// ============================================================

function isTrialActive(
  user
) {
  if (
    !user?.proTrialUntil
  ) {
    return false;
  }

  const until =
    new Date(
      user.proTrialUntil
    ).getTime();

  return (
    Number.isFinite(until) &&
    until >
      Date.now()
  );
}

// ============================================================
// 👤 GET USER PLAN
// ------------------------------------------------------------
// Priority:
//   1. Active Pro trial
//   2. Permanent Pro
//   3. Free
// ============================================================

function getUserPlan(
  user
) {
  ensureUserShape(
    user
  );

  // ----------------------------------------------------------
  // ACTIVE TRIAL
  // ----------------------------------------------------------

  if (
    isTrialActive(user)
  ) {
    return {
      ...PLANS.pro,

      viaTrial:
        true
    };
  }

  // ----------------------------------------------------------
  // PERMANENT PRO
  // ----------------------------------------------------------

  if (
    normalizePlan(user) ===
    "pro"
  ) {
    return {
      ...PLANS.pro,

      viaTrial:
        false
    };
  }

  // ----------------------------------------------------------
  // FREE
  // ----------------------------------------------------------

  return {
    ...PLANS.free,

    viaTrial:
      false
  };
}

// ============================================================
// 🚦 USAGE LIMIT CHECK
// ------------------------------------------------------------
// type:
//   "message"
//   "image"
// ============================================================

function checkUsageLimit(
  user,
  type
) {
  ensureUserShape(
    user
  );

  const plan =
    getUserPlan(
      user
    );

  const normalizedType =
    String(
      type || ""
    )
      .trim()
      .toLowerCase();

  const isImage =
    normalizedType ===
    "image";

  const limitKey =
    isImage
      ? "imagesPerDay"
      : "messagesPerDay";

  const usedKey =
    isImage
      ? "images"
      : "messages";

  const limit =
    Number(
      plan[limitKey]
    ) || 0;

  const current =
    Number(
      user.usage[usedKey]
    ) || 0;

  return {
    allowed:
      current <
      limit,

    limit,

    current,

    remaining:
      Math.max(
        0,
        limit -
          current
      )
  };
}

// ============================================================
// 🔢 TOKEN LIMIT CHECK
// ============================================================

function checkTokenLimit(
  user,
  {
    inputTokens = 0,
    outputTokens = 0
  } = {}
) {
  ensureUserShape(
    user
  );

  const plan =
    getUserPlan(
      user
    );

  const input =
    Math.max(
      0,
      Number(
        inputTokens
      ) || 0
    );

  const output =
    Math.max(
      0,
      Number(
        outputTokens
      ) || 0
    );

  const current =
    Math.max(
      0,
      Number(
        user.usage.tokens
      ) || 0
    );

  const requested =
    input +
    output;

  const projected =
    current +
    requested;

  const limit =
    Number(
      plan.tokensPerDay
    ) || 0;

  // ----------------------------------------------------------
  // LIMIT EXCEEDED
  // ----------------------------------------------------------

  if (
    projected >
    limit
  ) {
    return {
      allowed:
        false,

      reason:
        `Daily token limit (${limit.toLocaleString()}) reached for your plan.`,

      limit,

      current,

      requested,

      remaining:
        Math.max(
          0,
          limit -
            current
        )
    };
  }

  // ----------------------------------------------------------
  // ALLOWED
  // ----------------------------------------------------------

  return {
    allowed:
      true,

    reason:
      null,

    limit,

    current,

    requested,

    remaining:
      Math.max(
        0,
        limit -
          projected
      )
  };
}

// ============================================================
// 📊 RECORD USAGE
// ------------------------------------------------------------
// type:
//   "message"
//   "image"
// ============================================================

function recordUsage(
  user,
  {
    type,
    inputTokens = 0,
    outputTokens = 0
  } = {}
) {
  ensureUserShape(
    user
  );

  // ----------------------------------------------------------
  // MESSAGE
  // ----------------------------------------------------------

  if (
    type ===
    "message"
  ) {
    user.usage.messages =
      (
        Number(
          user.usage.messages
        ) || 0
      ) + 1;
  }

  // ----------------------------------------------------------
  // IMAGE
  // ----------------------------------------------------------

  if (
    type ===
    "image"
  ) {
    user.usage.images =
      (
        Number(
          user.usage.images
        ) || 0
      ) + 1;
  }

  // ----------------------------------------------------------
  // TOKENS
  // ----------------------------------------------------------

  const input =
    Math.max(
      0,
      Number(
        inputTokens
      ) || 0
    );

  const output =
    Math.max(
      0,
      Number(
        outputTokens
      ) || 0
    );

  const tokenDelta =
    input +
    output;

  if (
    tokenDelta >
    0
  ) {
    user.usage.tokens =
      (
        Number(
          user.usage.tokens
        ) || 0
      ) +
      tokenDelta;
  }

  return user;
}

// ============================================================
// 📸 USAGE SNAPSHOT
// ============================================================

function getUsageSnapshot(
  user
) {
  ensureUserShape(
    user
  );

  const plan =
    getUserPlan(
      user
    );

  return {
    plan:
      plan.id,

    viaTrial:
      Boolean(
        plan.viaTrial
      ),

    proTrialUntil:
      user.proTrialUntil ||
      null,

    messages: {
      used:
        Number(
          user.usage.messages
        ) || 0,

      limit:
        plan.messagesPerDay
    },

    images: {
      used:
        Number(
          user.usage.images
        ) || 0,

      limit:
        plan.imagesPerDay
    },

    tokens: {
      used:
        Number(
          user.usage.tokens
        ) || 0,

      limit:
        plan.tokensPerDay
    }
  };
}

// ============================================================
// 🔐 FEATURE GATE
// ============================================================

function canUseFeature(
  user,
  feature
) {
  const plan =
    getUserPlan(
      user
    );

  return Boolean(
    plan.features?.[
      feature
    ]
  );
}

// ============================================================
// 📤 EXPLICIT EXPORTS
// ============================================================

export {
  PLANS,

  createDefaultUser,

  normalizePlan,

  resetDailyUsageIfNeeded,

  getUserPlan,

  checkUsageLimit,

  checkTokenLimit,

  recordUsage,

  getUsageSnapshot,

  canUseFeature
};

// ============================================================
// 👑 END PLANS ENGINE
// ============================================================
