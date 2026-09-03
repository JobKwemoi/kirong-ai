/* ============================================================
   👑 KIRONG AI — FRONTEND ENGINE V10
   FULL MANSION UPGRADE
   ------------------------------------------------------------
   Keeps:
   • Chat / Projects / Tools / History tabs
   • Persistent device user ID
   • Vercel backend compatibility
   • Chat history
   • File attachments
   • Image generation
   • Voice input/output
   • Copy buttons
   • Export
   • Projects CRUD
   • Pro badge scaffold
   • Royal guidelines
   • Safe error handling

   Adds:
   • Better API error handling
   • Abort / timeout protection
   • Request state protection
   • Safer localStorage handling
   • Better image detection
   • Better file handling
   • Usage / plan synchronization
   • Backend user usage endpoint support
   • Better project refresh
   • Keyboard shortcuts
   • Auto-resizing textarea
   • Better welcome handling
   • Message retry
   • Chat rename
   • Safer markdown rendering
   • Modal escape handling
   • Network status indicator
   • Improved voice language handling
============================================================ */

"use strict";

/* ============================================================
   ⚙️ CONFIGURATION
============================================================ */

const API_ENDPOINT = "/api/chat";
const IMAGE_ENDPOINT = "/api/image";
const PROJECTS_ENDPOINT = "/api/projects";

const MAX_HISTORY_ITEMS = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_STORED_CHATS = 50;
const MAX_STORED_MESSAGES = 50;

const REQUEST_TIMEOUT = 120000;

const WHATSAPP_NUMBER = "254792442670";
const WHATSAPP_BACKUP_NUMBER = "254736232188";

const WHATSAPP_MESSAGE =
  "Hello Kirong Job Kwemoi 👑, I came from Kirong AI and I would like to talk to you directly.";

/* ============================================================
   💾 STORAGE KEYS
============================================================ */

const STORAGE_KEYS = {
  chats: "kirong_ai_chats_v10",
  legacyChats: "kirong_ai_chats_v8",

  activeChat: "kirong_ai_active_chat_v10",
  legacyActiveChat: "kirong_ai_active_chat_v8",

  theme: "kirong_ai_theme_v8",
  language: "kirong_ai_language_v8",
  voice: "kirong_ai_voice_v8",

  visited: "kirong_visited",

  userId: "kirong_ai_user_id_v1",

  imageMode: "kirong_ai_image_mode_v1"
};

/* ============================================================
   🧩 DOM
============================================================ */

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");

const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const exportChatBtn = document.getElementById("exportChatBtn");

const clearHistoryBtn =
  document.getElementById("clearHistoryBtn");

const exportHistoryBtn =
  document.getElementById("exportHistoryBtn");

const clearToolsBtn =
  document.getElementById("clearToolsBtn");

const exportToolsBtn =
  document.getElementById("exportToolsBtn");

const thinking =
  document.getElementById("thinking");

const fileInput =
  document.getElementById("fileInput");

const attachBtn =
  document.getElementById("attachBtn");

const filePreview =
  document.getElementById("filePreview");

const newProjectBtn =
  document.getElementById("newProjectBtn");

const micBtn =
  document.getElementById("micBtn");

const voiceReplyBtn =
  document.getElementById("voiceReplyBtn");

const imageModeBtn =
  document.getElementById("imageModeBtn");

const planBadge =
  document.getElementById("planBadge");

const usageBarWrap =
  document.getElementById("usageBarWrap");

const usageBarFill =
  document.getElementById("usageBarFill");

const usageBarPercent =
  document.getElementById("usageBarPercent");

const usageLimitsBtn =
  document.getElementById("usageLimitsBtn");

const languageBtn =
  document.getElementById("languageBtn");

const onboardingOverlay =
  document.getElementById("onboardingOverlay");

const onboardingNameInput =
  document.getElementById("onboardingName");

const finishOnboardingBtn =
  document.getElementById("finishOnboarding");

const skipOnboardingBtn =
  document.getElementById("skipOnboarding");

const sidebar =
  document.getElementById("sidebar");

const sidebarToggle =
  document.getElementById("sidebarToggle");

const sidebarCloseBtn =
  document.getElementById("sidebarCloseBtn");

const sidebarOverlay =
  document.getElementById("sidebarOverlay");

const sidebarNewChatBtn =
  document.getElementById("sidebarNewChatBtn");

const sidebarPlanBadge =
  document.getElementById("sidebarPlanBadge");

const historySearchInput =
  document.getElementById("historySearchInput");

/* ============================================================
   🧠 STATE
============================================================ */

let messages = [];

let selectedFile = null;

let isSending = false;

let currentChatId = null;

let recognition = null;

let isListening = false;

let speechVoices = [];

let activeMode = "chat";

let imageModeOn =
  loadJSON(
    STORAGE_KEYS.imageMode,
    false
  );

let voiceRepliesEnabled =
  loadJSON(
    STORAGE_KEYS.voice,
    false
  );

let currentUserData = null;

let activeAbortController = null;

let userStoppedGeneration = false;

let networkOnline =
  navigator.onLine !== false;

/* ============================================================
   💾 STORAGE HELPERS
============================================================ */

function loadJSON(key, fallback) {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch {
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/* ============================================================
   🆔 CHAT IDS
============================================================ */

function createChatId() {
  return (
    "chat_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );
}

function createChatTitle(text) {
  const clean =
    String(text || "")
      .replace(/\s+/g, " ")
      .trim();

  if (!clean) {
    return "New Chat";
  }

  return clean.length > 42
    ? clean.slice(0, 42) + "..."
    : clean;
}

/* ============================================================
   👤 STABLE DEVICE USER ID
============================================================ */

function getDeviceUserId() {
  let id = null;

  try {
    id =
      localStorage.getItem(
        STORAGE_KEYS.userId
      );
  } catch {}

  if (id) {
    return id;
  }

  try {
    if (
      window.crypto &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      id = crypto.randomUUID();
    }
  } catch {}

  if (!id) {
    id =
      "user_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 12);
  }

  try {
    localStorage.setItem(
      STORAGE_KEYS.userId,
      id
    );
  } catch {}

  return id;
}

const DEVICE_USER_ID =
  getDeviceUserId();

/* ============================================================
   🌐 NETWORK STATUS
============================================================ */

function updateNetworkStatus() {
  networkOnline =
    navigator.onLine !== false;

  document.body.classList.toggle(
    "offline",
    !networkOnline
  );
}

window.addEventListener(
  "online",
  () => {
    updateNetworkStatus();
    showToast("🟢 Connection restored");
  }
);

window.addEventListener(
  "offline",
  () => {
    updateNetworkStatus();
    showToast("🔴 You are offline");
  }
);

/* ============================================================
   🧭 TABS
============================================================ */

function initTabs() {
  document
    .querySelectorAll(".tabBtn")
    .forEach((btn) => {
      btn.addEventListener(
        "click",
        () => {
          const tab =
            btn.dataset.tab;

          if (!tab) return;

          document
            .querySelectorAll(
              ".tabBtn"
            )
            .forEach((b) => {
              b.classList.remove(
                "active"
              );

              b.setAttribute(
                "aria-selected",
                "false"
              );
            });

          document
            .querySelectorAll(
              ".tabPanel"
            )
            .forEach((panel) => {
              panel.classList.remove(
                "active"
              );

              panel.hidden = true;
            });

          btn.classList.add(
            "active"
          );

          btn.setAttribute(
            "aria-selected",
            "true"
          );

          const panel =
            document.getElementById(
              tab
            );

          if (panel) {
            panel.classList.add(
              "active"
            );

            panel.hidden = false;
          }

          if (
            tab === "projects"
          ) {
            renderProjectsGrid();
          }

          if (
            tab === "history"
          ) {
            renderHistoryList();
          }

          closeSidebar();
        }
      );
    });
}

/* ============================================================
   👑 SIDEBAR (ChatGPT-style: New chat, search, recents)
   ------------------------------------------------------------
   Permanent panel on desktop (CSS overrides the fixed/transform
   rules at >=900px), off-canvas drawer on mobile — opened via the
   hamburger button in the top bar, closed via the ✕ button, an
   overlay tap, or automatically after picking a nav item / chat.
============================================================ */

function openSidebar() {
  sidebar?.classList.add("open");
  sidebarOverlay?.classList.add("open");
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("open");
}

function toggleSidebar() {
  if (sidebar?.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", toggleSidebar);
}

if (sidebarCloseBtn) {
  sidebarCloseBtn.addEventListener("click", closeSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", closeSidebar);
}

if (sidebarNewChatBtn) {
  sidebarNewChatBtn.addEventListener("click", () => {
    startNewChat();

    document
      .querySelector('.tabBtn[data-tab="chat"]')
      ?.click();

    closeSidebar();
  });
}

if (sidebarPlanBadge) {
  sidebarPlanBadge.addEventListener("click", () => openProPaymentModal());
}

// --------------------------------------------------------
// 🔍 SEARCH CHATS (History tab's list)
// --------------------------------------------------------

if (historySearchInput) {
  historySearchInput.addEventListener("input", () => {
    const query = historySearchInput.value.trim().toLowerCase();
    const items =
      document.querySelectorAll("#historyList .historyItem");

    items.forEach((item) => {
      const matches =
        !query ||
        (item.dataset.searchText || "").includes(query);

      item.style.display = matches ? "" : "none";
    });
  });
}

// --------------------------------------------------------
// 👉 EDGE-SWIPE GESTURE — swipe right from the screen's left
// edge to open the sidebar, swipe left anywhere to close it,
// same as ChatGPT's mobile app. Only listens on touch devices;
// desktop mouse users already have the permanent sidebar (CSS
// disables the drawer transform above 900px) so this is a no-op
// there regardless.
// --------------------------------------------------------

(function initSidebarSwipeGesture() {
  const EDGE_ZONE_PX = 28; // how close to the left edge a swipe must start to open
  const SWIPE_THRESHOLD_PX = 60; // minimum horizontal travel to trigger
  const MAX_VERTICAL_DRIFT_PX = 60; // ignore mostly-vertical touches (scrolling)

  let touchStartX = null;
  let touchStartY = null;
  let startedAtEdge = false;
  let sidebarWasOpenAtStart = false;

  document.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      startedAtEdge = touch.clientX <= EDGE_ZONE_PX;
      sidebarWasOpenAtStart =
        sidebar?.classList.contains("open") || false;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    (event) => {
      if (touchStartX === null) return;

      const touch = event.changedTouches?.[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = Math.abs(touch.clientY - touchStartY);

      if (deltaY <= MAX_VERTICAL_DRIFT_PX) {
        if (
          !sidebarWasOpenAtStart &&
          startedAtEdge &&
          deltaX >= SWIPE_THRESHOLD_PX
        ) {
          openSidebar();
        } else if (
          sidebarWasOpenAtStart &&
          deltaX <= -SWIPE_THRESHOLD_PX
        ) {
          closeSidebar();
        }
      }

      touchStartX = null;
      touchStartY = null;
    },
    { passive: true }
  );
})();

/* ============================================================
   👑 ROYAL GUIDELINES
   ------------------------------------------------------------
   The quickGrid prompt buttons this used to manage were removed
   to declutter the chat screen — kept as a no-op stub since
   showWelcome() still calls it.
============================================================ */

function initRoyalGuidelines() {}

/* ============================================================
   🛡️ HTML SAFETY
============================================================ */

function escapeHTML(value) {
  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    String(value ?? "");

  return div.innerHTML;
}

/* ============================================================
   📝 MARKDOWN RENDERER
============================================================ */

function renderMarkdown(text) {
  let source =
    String(text || "");

  /*
   * Protect fenced code blocks first.
   */

  const codeBlocks = [];

  source =
    source.replace(
      /```([\w+-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {
        const index =
          codeBlocks.length;

        codeBlocks.push({
          language:
            language || "",
          code:
            code.trim()
        });

        return `@@KIRONG_CODE_${index}@@`;
      }
    );

  let html =
    escapeHTML(source);

  /*
   * Inline formatting.
   */

  html =
    html.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

  html =
    html.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  html =
    html.replace(
      /\*(.*?)\*/g,
      "<em>$1</em>"
    );

  /*
   * Headings.
   */

  html =
    html.replace(
      /^### (.*)$/gm,
      "<h4>$1</h4>"
    );

  html =
    html.replace(
      /^## (.*)$/gm,
      "<h3>$1</h3>"
    );

  html =
    html.replace(
      /^# (.*)$/gm,
      "<h2>$1</h2>"
    );

  /*
   * Basic unordered lists.
   */

  html =
    html.replace(
      /^[-•] (.*)$/gm,
      "<li>$1</li>"
    );

  /*
   * Safe links.
   */

  html =
    html.replace(
      /(https?:\/\/[^\s<]+)/g,
      (url) => {
        const clean =
          url.replace(
            /[),.!?]+$/,
            ""
          );

        return (
          `<a href="${clean}" ` +
          `target="_blank" ` +
          `rel="noopener noreferrer">` +
          `${clean}` +
          `</a>`
        );
      }
    );

  /*
   * Restore code blocks.
   */

  codeBlocks.forEach(
    (block, index) => {
      const token =
        `@@KIRONG_CODE_${index}@@`;

      const encoded =
        encodeURIComponent(
          block.code
        );

      const language =
        block.language
          ? escapeHTML(
              block.language
            )
          : "";

      const replacement =
        `<div class="codeWrapper">` +
        `<div class="codeHeader">` +
        `<span>${language}</span>` +
        `<button class="copyCodeBtn" ` +
        `data-copy="${encoded}">` +
        `📋 Copy` +
        `</button>` +
        `</div>` +
        `<pre class="codeBlock"><code>` +
        `${escapeHTML(
          block.code
        )}` +
        `</code></pre>` +
        `</div>`;

      html =
        html.replace(
          token,
          replacement
        );
    }
  );

  html =
    html.replace(
      /\n/g,
      "<br>"
    );

  return html;
}

/* ============================================================
   🍞 TOAST
============================================================ */

function showToast(message) {
  let toast =
    document.getElementById(
      "kirongToast"
    );

  if (!toast) {
    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "kirongToast";

    toast.className =
      "kirongToast";

    document.body.appendChild(
      toast
    );
  }

  toast.textContent =
    String(message || "");

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toast._timeout
  );

  toast._timeout =
    setTimeout(() => {
      toast.classList.remove(
        "show"
      );
    }, 2400);
}

/* ============================================================
   📋 COPY
============================================================ */

async function copyText(text) {
  const value =
    String(text || "");

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        value
      );

      showToast(
        "📋 Copied!"
      );

      return true;
    }
  } catch {}

  try {
    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      value;

    textarea.style.position =
      "fixed";

    textarea.style.left =
      "-9999px";

    document.body.appendChild(
      textarea
    );

    textarea.focus();
    textarea.select();

    document.execCommand(
      "copy"
    );

    textarea.remove();

    showToast(
      "📋 Copied!"
    );

    return true;
  } catch {
    showToast(
      "⚠️ Copy failed"
    );

    return false;
  }
}

/* ============================================================
   📜 CHAT SCROLL
============================================================ */

function isUserNearBottom() {
  if (!chatBox) {
    return true;
  }

  return (
    chatBox.scrollHeight -
      chatBox.scrollTop -
      chatBox.clientHeight <=
    120
  );
}

function scrollToBottom(force = false) {
  if (!chatBox) return;

  if (
    !force &&
    !isUserNearBottom()
  ) {
    return;
  }

  requestAnimationFrame(() => {
    chatBox.scrollTo({
      top:
        chatBox.scrollHeight,
      behavior: "smooth"
    });
  });
}

/* ============================================================
   🧠 THINKING
============================================================ */

function setThinking(active) {
  if (thinking) {
    thinking.classList.toggle(
      "hidden",
      !active
    );
  }

  if (active) {
    scrollToBottom();
  }
}

/* ============================================================
   🚦 SENDING STATE
============================================================ */

function setSendingState(active) {
  isSending =
    Boolean(active);

  if (sendBtn) {
    // Keep the button enabled while sending — it becomes a Stop
    // button instead of a disabled Send button, so the person can
    // interrupt a long-running reply instead of just waiting.
    sendBtn.disabled = false;

    sendBtn.classList.toggle(
      "stopping",
      isSending
    );

    sendBtn.innerHTML =
      isSending
        ? 'Stop <span aria-hidden="true">■</span>'
        : 'Send <span aria-hidden="true">↑</span>';

    sendBtn.title =
      isSending
        ? "Stop generating"
        : "Send";

    sendBtn.setAttribute(
      "aria-label",
      isSending
        ? "Stop generating"
        : "Send message"
    );
  }

  if (userInput) {
    userInput.disabled =
      isSending;
  }

  if (attachBtn) {
    attachBtn.disabled =
      isSending;
  }

  if (imageModeBtn) {
    imageModeBtn.disabled =
      isSending;
  }
}

/* ============================================================
   🛑 STOP GENERATING
   ------------------------------------------------------------
   Aborts the in-flight request. sendMessage()'s streaming loop
   catches the resulting AbortError and finalizes whatever text
   had already streamed in, instead of discarding it or treating
   it as a connection failure.
============================================================ */

function stopGenerating() {
  if (!isSending || !activeAbortController) {
    return;
  }

  userStoppedGeneration = true;

  try {
    activeAbortController.abort();
  } catch {}
}

/* ============================================================
   💬 ADD MESSAGE
============================================================ */

function addMessage(
  role,
  text,
  options = {}
) {
  if (!chatBox) {
    return null;
  }

  const autoScroll =
    isUserNearBottom();

  const message =
    document.createElement(
      "div"
    );

  message.className =
    `message ${role}-message`;

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "messageBubble";

  if (options.file) {
    const fileCard =
      document.createElement(
        "div"
      );

    fileCard.className =
      "attachedFile";

    fileCard.innerHTML =
      `<span>📎</span>` +
      `<span>${escapeHTML(
        options.file
      )}</span>`;

    bubble.appendChild(
      fileCard
    );
  }

  if (text) {
    const content =
      document.createElement(
        "div"
      );

    content.className =
      "messageContent";

    content.innerHTML =
      role === "assistant"
        ? renderMarkdown(text)
        : escapeHTML(
            text
          ).replace(
            /\n/g,
            "<br>"
          );

    bubble.appendChild(
      content
    );

    if (
      role ===
      "assistant"
    ) {
      const actions =
        document.createElement(
          "div"
        );

      actions.className =
        "messageActions";

      const copyBtn =
        document.createElement(
          "button"
        );

      copyBtn.className =
        "copyMessageBtn";

      copyBtn.textContent =
        "📋 Copy";

      copyBtn.addEventListener(
        "click",
        () =>
          copyText(text)
      );

      actions.appendChild(
        copyBtn
      );

      if (
        "speechSynthesis" in
        window
      ) {
        const speakBtn =
          document.createElement(
            "button"
          );

        speakBtn.className =
          "speakMessageBtn";

        speakBtn.textContent =
          "🔊 Listen";

        speakBtn.addEventListener(
          "click",
          () =>
            speakText(
              text,
              speakBtn
            )
        );

        actions.appendChild(
          speakBtn
        );
      }

      const retryBtn =
        document.createElement(
          "button"
        );

      retryBtn.className =
        "retryMessageBtn";

      retryBtn.textContent =
        "↻ Retry";

      retryBtn.addEventListener(
        "click",
        () =>
          retryLastUserMessage()
      );

      actions.appendChild(
        retryBtn
      );

      bubble.appendChild(
        actions
      );
    } else if (
      role === "user"
    ) {
      const actions =
        document.createElement(
          "div"
        );

      actions.className =
        "messageActions";

      const editBtn =
        document.createElement(
          "button"
        );

      editBtn.className =
        "editMessageBtn";

      editBtn.textContent =
        "✏️ Edit";

      editBtn.addEventListener(
        "click",
        () => {
          if (userInput) {
            userInput.value =
              text.replace(
                /^Please analyze file:\s*/,
                ""
              );

            autoResizeInput();

            userInput.focus();
          }
        }
      );

      actions.appendChild(
        editBtn
      );

      bubble.appendChild(
        actions
      );
    }
  }

  message.appendChild(
    bubble
  );

  chatBox.appendChild(
    message
  );

  if (autoScroll) {
    scrollToBottom();
  }

  return message;
}

/* ============================================================
   🎨 IMAGE MESSAGE
============================================================ */

function addImageMessage(
  text,
  image,
  provider = "",
  prompt = ""
) {
  if (
    !chatBox ||
    !image
  ) {
    return null;
  }

  const autoScroll =
    isUserNearBottom();

  const message =
    document.createElement(
      "div"
    );

  message.className =
    "message assistant-message";

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "messageBubble imageMessage";

  if (text) {
    const content =
      document.createElement(
        "div"
      );

    content.className =
      "messageContent";

    content.innerHTML =
      renderMarkdown(text);

    bubble.appendChild(
      content
    );
  }

  const img =
    document.createElement(
      "img"
    );

  img.src =
    image;

  img.alt =
    prompt ||
    "Generated image";

  img.className =
    "generatedImage";

  img.loading =
    "lazy";

  img.addEventListener(
    "click",
    () =>
      openImageLightbox(
        image,
        prompt
      )
  );

  img.onerror = () => {
    const errorBox =
      document.createElement(
        "div"
      );

    errorBox.className =
      "messageContent";

    errorBox.innerHTML =
      `⚠️ Image failed to load. ` +
      `Try opening it directly: ` +
      `<a href="${escapeHTML(
        image
      )}" target="_blank" rel="noopener noreferrer">Open image</a>`;

    img.replaceWith(
      errorBox
    );
  };

  bubble.appendChild(
    img
  );

  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "imageActions";

  const download =
    document.createElement(
      "button"
    );

  download.textContent =
    "⬇️ Save";

  download.addEventListener(
    "click",
    () => {
      const a =
        document.createElement(
          "a"
        );

      a.href =
        image;

      a.download =
        `kirong-${Date.now()}.png`;

      document.body.appendChild(
        a
      );

      a.click();

      a.remove();

      showToast(
        "🖼️ Saved"
      );
    }
  );

  actions.appendChild(
    download
  );

  const copy =
    document.createElement(
      "button"
    );

  copy.textContent =
    "📋 Copy";

  copy.addEventListener(
    "click",
    () =>
      copyText(image)
  );

  actions.appendChild(
    copy
  );

  bubble.appendChild(
    actions
  );

  if (provider) {
    const source =
      document.createElement(
        "small"
      );

    source.className =
      "imageProvider";

    source.textContent =
      `Generated by ${provider}`;

    bubble.appendChild(
      source
    );
  }

  message.appendChild(
    bubble
  );

  chatBox.appendChild(
    message
  );

  if (autoScroll) {
    scrollToBottom();
  }

  return message;
}

/* ============================================================
   📋 COPY CODE DELEGATION
============================================================ */

if (chatBox) {
  chatBox.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          ".copyCodeBtn"
        );

      if (!button) {
        return;
      }

      let text = "";

      try {
        text =
          decodeURIComponent(
            button.dataset.copy ||
              ""
          );
      } catch {
        text =
          button.dataset.copy ||
          "";
      }

      copyText(text);
    }
  );
}

/* ============================================================
   📎 FILE PREVIEW
============================================================ */

function renderFilePreview() {
  if (!filePreview) {
    return;
  }

  if (!selectedFile) {
    filePreview.innerHTML =
      "";

    filePreview.classList.add(
      "hidden"
    );

    return;
  }

  filePreview.classList.remove(
    "hidden"
  );

  filePreview.innerHTML =
    `<span class="fileChip">` +
    `📎 ${escapeHTML(
      selectedFile.name
    )}` +
    `<button type="button" ` +
    `id="removeFileBtn" ` +
    `aria-label="Remove attached file">` +
    `✕` +
    `</button>` +
    `</span>`;

  document
    .getElementById(
      "removeFileBtn"
    )
    ?.addEventListener(
      "click",
      () => {
        selectedFile =
          null;

        if (fileInput) {
          fileInput.value =
            "";
        }

        renderFilePreview();
      }
    );
}

/* ============================================================
   📂 FILE INPUT
============================================================ */

if (attachBtn) {
  attachBtn.addEventListener(
    "click",
    () =>
      fileInput?.click()
  );
}

if (fileInput) {
  fileInput.addEventListener(
    "change",
    () => {
      const file =
        fileInput.files?.[0];

      if (!file) {
        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        showToast(
          "⚠️ File too large — maximum 10MB"
        );

        fileInput.value =
          "";

        selectedFile =
          null;

        renderFilePreview();

        return;
      }

      selectedFile =
        file;

      renderFilePreview();

      showToast(
        `📎 ${file.name} attached`
      );
    }
  );
}

/* ============================================================
   🎤 SPEECH RECOGNITION
============================================================ */

const SpeechRecognitionAPI =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

// True when we're using the Hugging Face Whisper fallback instead
// of the browser's native SpeechRecognition (e.g. desktop Firefox,
// which has never supported the Web Speech API).
let usingWhisperFallback = false;

let mediaRecorder = null;
let recordedAudioChunks = [];

function initSpeechRecognition() {
  if (SpeechRecognitionAPI) {
    recognition =
      new SpeechRecognitionAPI();

    recognition.continuous =
      false;

    recognition.interimResults =
      true;

    recognition.lang =
      getRecognitionLanguage();

    recognition.onresult =
      (event) => {
        let transcript =
          "";

        for (
          let i = 0;
          i <
          event.results.length;
          i++
        ) {
          transcript +=
            event.results[i][0]
              .transcript;
        }

        if (userInput) {
          userInput.value =
            transcript;

          autoResizeInput();
        }
      };

    recognition.onerror =
      (event) => {
        isListening =
          false;

        micBtn?.classList.remove(
          "listening"
        );

        if (
          event.error ===
            "not-allowed" ||
          event.error ===
            "service-not-allowed"
        ) {
          showToast(
            "⚠️ Microphone access denied"
          );
        } else if (
          event.error !==
            "no-speech" &&
          event.error !==
            "aborted"
        ) {
          showToast(
            "⚠️ Voice input error"
          );
        }
      };

    recognition.onend =
      () => {
        isListening =
          false;

        micBtn?.classList.remove(
          "listening"
        );
      };

    return;
  }

  // No native SpeechRecognition — try the Whisper fallback instead
  // of just hiding the mic. This covers desktop Firefox and any
  // browser that has never implemented the Web Speech API.
  if (
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.MediaRecorder
  ) {
    usingWhisperFallback = true;
    return;
  }

  // Truly nothing we can do (very old browser) — hide the mic.
  if (micBtn) {
    micBtn.style.display = "none";
  }
}

function getRecognitionLanguage() {
  const language =
    loadJSON(
      STORAGE_KEYS.language,
      "English"
    );

  const map = {
    English: "en-US",
    Swahili: "sw-KE",
    French: "fr-FR",
    Spanish: "es-ES",
    Hindi: "hi-IN"
  };

  return (
    map[language] ||
    "en-US"
  );
}

function toggleListening() {
  if (usingWhisperFallback) {
    toggleWhisperRecording();
    return;
  }

  if (!recognition) {
    showToast(
      "⚠️ Voice input is not supported"
    );

    return;
  }

  if (isListening) {
    try {
      recognition.stop();
    } catch {}

    isListening =
      false;

    micBtn?.classList.remove(
      "listening"
    );

    return;
  }

  try {
    recognition.lang =
      getRecognitionLanguage();

    recognition.start();

    isListening =
      true;

    micBtn?.classList.add(
      "listening"
    );
  } catch {}
}

/* ============================================================
   🎙️ WHISPER FALLBACK — records audio via MediaRecorder and
   sends it to /api/stt for transcription (Hugging Face Whisper).
   Used only when the browser has no native SpeechRecognition.
============================================================ */

async function toggleWhisperRecording() {
  if (isListening) {
    try {
      mediaRecorder?.stop();
    } catch {}

    return; // onstop handler below finishes the flow
  }

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia({ audio: true });

    recordedAudioChunks = [];

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedAudioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      isListening = false;
      micBtn?.classList.remove("listening");

      stream.getTracks().forEach((track) => track.stop());

      const blob = new Blob(
        recordedAudioChunks,
        { type: mediaRecorder.mimeType || "audio/webm" }
      );

      recordedAudioChunks = [];

      if (blob.size > 0) {
        await transcribeRecording(blob);
      }
    };

    mediaRecorder.start();

    isListening = true;
    micBtn?.classList.add("listening");

    showToast("🎤 Recording... tap the mic again to stop");
  } catch {
    showToast("⚠️ Microphone access denied");
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function transcribeRecording(blob) {
  showToast("📝 Transcribing...");

  try {
    const base64Audio = await blobToBase64(blob);

    const response = await fetch("/api/stt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kirong-User-Id": DEVICE_USER_ID
      },
      body: JSON.stringify({
        audio: base64Audio,
        mimeType: blob.type
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(
        response.ok
          ? extractApiError(data)
          : `${extractApiError(data)} (Server ${response.status})`
      );
    }

    if (userInput) {
      userInput.value = data.text || "";
      autoResizeInput();
      userInput.focus();
    }

    if (!data.text) {
      showToast("⚠️ Didn't catch that — try again");
    }
  } catch (error) {
    showToast(`⚠️ ${friendlyError(error)}`);
  }
}

if (micBtn) {
  micBtn.addEventListener(
    "click",
    toggleListening
  );
}

/* ============================================================
   🔊 SPEECH SYNTHESIS
============================================================ */

function loadSpeechVoices() {
  if (
    !(
      "speechSynthesis" in
      window
    )
  ) {
    return;
  }

  speechVoices =
    window.speechSynthesis.getVoices();
}

if (
  "speechSynthesis" in
  window
) {
  loadSpeechVoices();

  window.speechSynthesis.onvoiceschanged =
    loadSpeechVoices;
}

/* Kirong replies in whichever language the user used (per its
   system prompt), so speech output must match the actual TEXT,
   not a fixed setting. This checks for common Swahili function
   words to decide which voice/lang to use for text-to-speech. */
function detectSpeechLanguage(text) {
  const t = " " + String(text || "").toLowerCase() + " ";

  const swahiliMarkers = [
    " ni ", " na ", " kwa ", " ya ", " wa ", " hii ", " hiyo ",
    " karibu ", " habari ", " asante ", " tafadhali ", " unaweza ",
    " nini ", " vipi ", " sana ", " bado ", " kila ", " kutoka ",
    " mpaka ", " kwamba ", " kuhusu ", " lakini ", " kwenye ",
    " ndio ", " hapana ", " leo ", " sasa ", " tena ", " pia "
  ];

  let hits = 0;

  for (const marker of swahiliMarkers) {
    if (t.includes(marker)) hits++;
    if (hits >= 2) return "sw-KE";
  }

  return "en-US";
}

function stripMarkdownForSpeech(
  text
) {
  return String(text || "")
    .replace(
      /```[\s\S]*?```/g,
      "Code block. See the chat for details."
    )
    .replace(
      /`([^`]+)`/g,
      "$1"
    )
    .replace(
      /\*\*(.*?)\*\*/g,
      "$1"
    )
    .replace(
      /\*(.*?)\*/g,
      "$1"
    )
    .replace(
      /^#+\s*/gm,
      ""
    )
    .replace(
      /https?:\/\/\S+/g,
      "a link"
    )
    .trim();
}

function speakTextBrowser(
  text,
  button
) {
  if (
    !(
      "speechSynthesis" in
      window
    )
  ) {
    showToast(
      "⚠️ Voice output not supported"
    );

    return;
  }

  const synth =
    window.speechSynthesis;

  if (
    button &&
    button.classList.contains(
      "speaking"
    )
  ) {
    synth.cancel();

    button.classList.remove(
      "speaking"
    );

    button.textContent =
      "🔊 Listen";

    return;
  }

  synth.cancel();

  document
    .querySelectorAll(
      ".speakMessageBtn.speaking"
    )
    .forEach((btn) => {
      btn.classList.remove(
        "speaking"
      );

      btn.textContent =
        "🔊 Listen";
    });

  const utterance =
    new SpeechSynthesisUtterance(
      stripMarkdownForSpeech(
        text
      )
    );

  const detectedLang =
    detectSpeechLanguage(text);

  utterance.lang =
    detectedLang;

  // Try to find a voice that actually matches the detected
  // language (e.g. "sw-KE" or "sw"). Many devices don't ship a
  // Swahili voice at all — in that case we deliberately do NOT
  // force an English voice onto Swahili text (that's what caused
  // the "spelling out letters" bug), and instead leave utterance.voice
  // unset so the browser picks its own best-effort default for
  // the language we told it via utterance.lang.
  const matchingVoice =
    speechVoices.find((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith(
          detectedLang
            .slice(0, 2)
            .toLowerCase()
        )
    );

  if (matchingVoice) {
    utterance.voice =
      matchingVoice;
  }

  utterance.rate =
    1;

  utterance.pitch =
    1;

  if (button) {
    button.classList.add(
      "speaking"
    );

    button.textContent =
      "⏸️ Stop";

    utterance.onend =
      () => {
        button.classList.remove(
          "speaking"
        );

        button.textContent =
          "🔊 Listen";
      };

    utterance.onerror =
      () => {
        button.classList.remove(
          "speaking"
        );

        button.textContent =
          "🔊 Listen";
      };
  }

  synth.speak(
    utterance
  );
}

/* ============================================================
   🎧 HD VOICE (Hugging Face TTS) — now the DEFAULT for speech
   output. Falls back silently to the browser's built-in voice
   (speakTextBrowser above) if HD voice is unavailable, times out,
   or isn't configured — voice output should never just break.
============================================================ */

let currentHDAudio = null;

function stopAllSpeech() {
  if (currentHDAudio) {
    currentHDAudio.pause();
    currentHDAudio.currentTime = 0;
    currentHDAudio = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  document
    .querySelectorAll(".speakMessageBtn.speaking")
    .forEach((btn) => {
      btn.classList.remove("speaking");
      btn.textContent = "🔊 Listen";
    });
}

async function speakText(text, button) {
  // Toggle off if this exact button is already playing something.
  if (button && button.classList.contains("speaking")) {
    stopAllSpeech();
    return;
  }

  stopAllSpeech();

  if (button) {
    button.classList.add("speaking");
    button.textContent = "⏳ Loading voice...";
  }

  const cleanedText = stripMarkdownForSpeech(text);
  const detectedLang = detectSpeechLanguage(text);
  const hfLang = detectedLang.startsWith("sw") ? "sw" : "en";

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kirong-User-Id": DEVICE_USER_ID
      },
      body: JSON.stringify({ text: cleanedText, lang: hfLang })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok || !data.audio) {
      throw new Error(
        response.ok
          ? extractApiError(data)
          : `${extractApiError(data)} (Server ${response.status})`
      );
    }

    const audio = new Audio(data.audio);
    currentHDAudio = audio;

    if (button) {
      button.textContent = "⏸️ Stop";
    }

    audio.onended = () => {
      if (currentHDAudio === audio) currentHDAudio = null;
      if (button) {
        button.classList.remove("speaking");
        button.textContent = "🔊 Listen";
      }
    };

    audio.onerror = () => {
      if (currentHDAudio === audio) currentHDAudio = null;
      if (button) {
        button.classList.remove("speaking");
        button.textContent = "🔊 Listen";
      }
    };

    await audio.play();
  } catch (error) {
    // HD voice failed (not configured, timed out, cold-starting) —
    // fall back to the browser's built-in voice so speech output
    // still works, just without the HD quality upgrade.
    if (button) {
      button.classList.remove("speaking");
      button.textContent = "🔊 Listen";
    }
    speakTextBrowser(text, button);
  }
}

/* ============================================================
   🔊 AUTO VOICE REPLIES
============================================================ */

function updateVoiceReplyBtn() {
  if (!voiceReplyBtn) {
    return;
  }

  voiceReplyBtn.textContent =
    voiceRepliesEnabled
      ? "🔊"
      : "🔇";

  voiceReplyBtn.classList.toggle(
    "active",
    voiceRepliesEnabled
  );

  voiceReplyBtn.setAttribute(
    "aria-pressed",
    String(
      voiceRepliesEnabled
    )
  );

  voiceReplyBtn.title =
    voiceRepliesEnabled
      ? "Voice replies: ON"
      : "Voice replies: OFF";
}

if (voiceReplyBtn) {
  updateVoiceReplyBtn();

  voiceReplyBtn.addEventListener(
    "click",
    () => {
      voiceRepliesEnabled =
        !voiceRepliesEnabled;

      saveJSON(
        STORAGE_KEYS.voice,
        voiceRepliesEnabled
      );

      updateVoiceReplyBtn();

      if (!voiceRepliesEnabled) {
        stopAllSpeech();
      }

      showToast(
        voiceRepliesEnabled
          ? "🔊 Voice replies ON"
          : "🔇 Voice replies OFF"
      );
    }
  );
}

/* ============================================================
   🧠 IMAGE MODE
============================================================ */

function isImageRequest(text) {
  const t =
    String(text || "")
      .toLowerCase()
      .trim();

  const hasVerb =
    /\b(draw|paint|illustrate|sketch|design|generate|create|make|render|visualize|show me)\b/i.test(
      t
    );

  const hasNoun =
    /\b(image|picture|photo|photograph|logo|drawing|illustration|artwork|poster|avatar|wallpaper)\b/i.test(
      t
    );

  const swahili =
    /\bchora\b/i.test(t) ||
    /\bpicha\b/i.test(t) ||
    /tengeneza\s+picha/i.test(t) ||
    /unda\s+picha/i.test(t) ||
    /nitengenezee\s+picha/i.test(t);

  return (
    (hasVerb && hasNoun) ||
    swahili
  );
}

function updateImageModeBtn() {
  if (!imageModeBtn) {
    return;
  }

  imageModeBtn.classList.toggle(
    "active",
    imageModeOn
  );

  imageModeBtn.setAttribute(
    "aria-pressed",
    String(imageModeOn)
  );

  imageModeBtn.title =
    imageModeOn
      ? "Image mode: ON"
      : "Image mode: OFF";

  if (userInput) {
    userInput.placeholder =
      imageModeOn
        ? "Describe the image you want..."
        : "Ask Kirong anything...";
  }
}

if (imageModeBtn) {
  imageModeBtn.addEventListener(
    "click",
    () => {
      imageModeOn =
        !imageModeOn;

      saveJSON(
        STORAGE_KEYS.imageMode,
        imageModeOn
      );

      updateImageModeBtn();

      showToast(
        imageModeOn
          ? "🎨 Image mode ON"
          : "🎨 Image mode OFF"
      );

      userInput?.focus();
    }
  );
}

/* ============================================================
   🧰 TOOLS SUPER-MODES
   ------------------------------------------------------------
   chat.js already understands these modes and (via plans.js)
   already gates the last four as Pro-only. This just wires the
   Tools tab cards to actually set `mode` on outgoing requests —
   previously buildFormData() never sent a mode field at all, so
   these backend super-modes were dormant.
============================================================ */

const MODE_LABELS = {
  content: { icon: "📝", label: "Content Factory" },
  whatsapp: { icon: "📱", label: "WhatsApp Business" },
  blog: { icon: "✍️", label: "Blog Engine" },
  affiliate: { icon: "🤝", label: "Affiliate Engine" },
  school: { icon: "🎓", label: "School Mode" }
};

const modeBanner = document.getElementById("modeBanner");

function updateModeBanner() {
  if (!modeBanner) return;

  const info = MODE_LABELS[activeMode];

  if (!info) {
    modeBanner.classList.add("hidden");
    modeBanner.innerHTML = "";
    return;
  }

  modeBanner.classList.remove("hidden");
  modeBanner.innerHTML =
    `<span>${info.icon} ${escapeHTML(info.label)} active</span>` +
    `<button type="button" id="exitModeBtn" aria-label="Exit ${escapeHTML(info.label)}">✕ Exit</button>`;

  document
    .getElementById("exitModeBtn")
    ?.addEventListener("click", () => setActiveMode("chat"));
}

function setActiveMode(mode, starterPrompt) {
  activeMode = MODE_LABELS[mode] ? mode : "chat";

  updateModeBanner();

  document.querySelector('.tabBtn[data-tab="chat"]')?.click();

  if (starterPrompt && userInput) {
    userInput.value = starterPrompt;
    autoResizeInput();
  }

  userInput?.focus();
}

document.querySelectorAll(".toolCard[data-mode]").forEach((card) => {
  card.addEventListener("click", () => {
    const mode = card.dataset.mode || "chat";
    const prompt = card.dataset.prompt || "";

    setActiveMode(mode, prompt);
  });
});

/* ============================================================
   💬 HISTORY
============================================================ */

function addToHistory(
  role,
  content,
  meta = {}
) {
  if (
    !content &&
    !meta.image
  ) {
    return;
  }

  messages.push({
    id:
      "msg_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 7),

    role,

    content:
      String(
        content || ""
      ),

    image:
      meta.image ||
      null,

    imagePrompt:
      meta.imagePrompt ||
      null,

    provider:
      meta.provider ||
      null,

    file:
      meta.file ||
      null,

    timestamp:
      Date.now()
  });

  if (
    messages.length >
    MAX_STORED_MESSAGES
  ) {
    messages =
      messages.slice(
        -MAX_STORED_MESSAGES
      );
  }

  saveCurrentChat();
}

/* ============================================================
   💾 SAVE CHAT
============================================================ */

function saveCurrentChat() {
  if (!currentChatId) {
    currentChatId =
      createChatId();

    localStorage.setItem(
      STORAGE_KEYS.activeChat,
      currentChatId
    );
  }

  let chats =
    loadJSON(
      STORAGE_KEYS.chats,
      null
    );

  /*
   * Backward compatibility with V8.
   */

  if (!Array.isArray(chats)) {
    chats =
      loadJSON(
        STORAGE_KEYS.legacyChats,
        []
      );
  }

  const firstUserMessage =
    messages.find(
      (item) =>
        item.role === "user" &&
        item.content
    );

  const data = {
    id:
      currentChatId,

    title:
      createChatTitle(
        firstUserMessage?.content
      ),

    messages:
      messages.slice(
        -MAX_STORED_MESSAGES
      ),

    updatedAt:
      Date.now()
  };

  const index =
    chats.findIndex(
      (chat) =>
        chat.id ===
        currentChatId
    );

  if (index >= 0) {
    chats[index] =
      data;
  } else {
    chats.unshift(
      data
    );
  }

  chats.sort(
    (a, b) =>
      (b.updatedAt || 0) -
      (a.updatedAt || 0)
  );

  saveJSON(
    STORAGE_KEYS.chats,
    chats.slice(
      0,
      MAX_STORED_CHATS
    )
  );

  localStorage.setItem(
    STORAGE_KEYS.activeChat,
    currentChatId
  );

  renderHistoryList();
}

/* ============================================================
   🔄 RESTORE CHAT
============================================================ */

function restoreChat() {
  let chats =
    loadJSON(
      STORAGE_KEYS.chats,
      null
    );

  if (!Array.isArray(chats)) {
    chats =
      loadJSON(
        STORAGE_KEYS.legacyChats,
        []
      );
  }

  let active =
    localStorage.getItem(
      STORAGE_KEYS.activeChat
    );

  if (!active) {
    active =
      localStorage.getItem(
        STORAGE_KEYS.legacyActiveChat
      );
  }

  if (!active) {
    currentChatId =
      createChatId();

    showWelcome();

    return;
  }

  const chat =
    chats.find(
      (item) =>
        item.id === active
    );

  if (!chat) {
    currentChatId =
      createChatId();

    showWelcome();

    return;
  }

  currentChatId =
    chat.id;

  messages =
    Array.isArray(
      chat.messages
    )
      ? chat.messages
          .filter(
            (item) =>
              item &&
              (item.role ===
                "user" ||
                item.role ===
                  "assistant")
          )
          .slice(
            -MAX_STORED_MESSAGES
          )
      : [];

  renderMessages();

  scrollToBottom(
    true
  );
}

/* ============================================================
   🖼️ RENDER MESSAGES
============================================================ */

function renderMessages() {
  if (!chatBox) {
    return;
  }

  chatBox.innerHTML =
    "";

  if (
    messages.length ===
    0
  ) {
    showWelcome();

    return;
  }

  messages.forEach(
    (item) => {
      if (item.image) {
        addImageMessage(
          item.content,
          item.image,
          item.provider,
          item.imagePrompt
        );
      } else {
        addMessage(
          item.role,
          item.content,
          item.file
            ? {
                file:
                  item.file
              }
            : {}
        );
      }
    }
  );
}

/* ============================================================
   👋 WELCOME
============================================================ */

function showWelcome() {
  if (!chatBox) {
    return;
  }

  chatBox.innerHTML =
    `
    <div class="welcome-card">
      <span class="welcome-crown" aria-hidden="true">♛</span>
      <h2>What can I help you create?</h2>
      <p>Ask a question, upload a document, or choose a tool to get started.</p>
    </div>
    `;

  applyTranslations();
}

/* ============================================================
   📜 HISTORY LIST
============================================================ */

function renderHistoryList() {
  const targets = [
    document.getElementById("historyList"),
    document.getElementById("sidebarHistoryList")
  ].filter(Boolean);

  if (!targets.length) {
    return;
  }

  let chats =
    loadJSON(
      STORAGE_KEYS.chats,
      null
    );

  if (!Array.isArray(chats)) {
    chats =
      loadJSON(
        STORAGE_KEYS.legacyChats,
        []
      );
  }

  if (!chats.length) {
    targets.forEach((list) => {
      list.innerHTML =
        '<p class="emptyText">No conversations yet. Start chatting!</p>';
    });

    return;
  }

  targets.forEach((list) => {
    list.innerHTML = "";

    chats
      .slice(0, 30)
      .forEach(
        (chat) => {
          const item =
            document.createElement(
              "div"
            );

          const title =
            chat.title ||
            "New Chat";

          item.className =
            "historyItem" +
            (chat.id ===
            currentChatId
              ? " active"
              : "");

          // Used by the sidebar search box to filter without
          // touching the DOM structure — plain lowercase title.
          item.dataset.searchText =
            title.toLowerCase();

          item.innerHTML =
            `<div>` +
            `<b>${escapeHTML(
              title
            )}</b>` +
            `<small>${new Date(
              chat.updatedAt ||
                Date.now()
            ).toLocaleDateString()}</small>` +
            `</div>` +
            `<button aria-label="Open chat">↗️</button>`;

          item.addEventListener(
            "click",
            () => {
              openChat(
                chat.id
              );

              closeSidebar();
            }
          );

          list.appendChild(
            item
          );
        }
      );
  });
}

/* ============================================================
   💬 OPEN CHAT
============================================================ */

function openChat(id) {
  let chats =
    loadJSON(
      STORAGE_KEYS.chats,
      []
    );

  if (!Array.isArray(chats)) {
    chats = [];
  }

  const chat =
    chats.find(
      (item) =>
        item.id === id
    );

  if (!chat) {
    return;
  }

  currentChatId =
    chat.id;

  localStorage.setItem(
    STORAGE_KEYS.activeChat,
    id
  );

  messages =
    Array.isArray(
      chat.messages
    )
      ? chat.messages
          .slice(
            -MAX_STORED_MESSAGES
          )
      : [];

  renderMessages();

  renderHistoryList();

  scrollToBottom(
    true
  );

  document
    .querySelector(
      '.tabBtn[data-tab="chat"]'
    )
    ?.click();

  showToast(
    "💬 Chat opened"
  );
}

/* ============================================================
   ➕ NEW CHAT
============================================================ */

function startNewChat() {
  if (messages.length) {
    saveCurrentChat();
  }

  messages = [];

  selectedFile =
    null;

  activeMode = "chat";
  updateModeBanner();

  currentChatId =
    createChatId();

  localStorage.setItem(
    STORAGE_KEYS.activeChat,
    currentChatId
  );

  if (fileInput) {
    fileInput.value =
      "";
  }

  renderFilePreview();

  showWelcome();

  renderHistoryList();

  showToast(
    "＋ New chat"
  );
}

/* ============================================================
   🔁 RETRY
============================================================ */

function retryLastUserMessage() {
  const lastUser =
    [...messages]
      .reverse()
      .find(
        (item) =>
          item.role ===
          "user"
      );

  if (!lastUser) {
    showToast(
      "No user message to retry"
    );

    return;
  }

  if (userInput) {
    userInput.value =
      lastUser.content
        .replace(
          /^Please analyze file:\s*/,
          ""
        );

    autoResizeInput();

    sendMessage();
  }
}

/* ============================================================
   📦 FORM DATA
============================================================ */

function buildFormData(
  message
) {
  const form =
    new FormData();

  form.append(
    "message",
    message
  );

  form.append(
    "mode",
    activeMode
  );

  form.append(
    "language",
    loadJSON(
      STORAGE_KEYS.language,
      "English"
    )
  );

  form.append(
    "userId",
    DEVICE_USER_ID
  );

  const history =
    messages
      .filter(
        (item) =>
          item &&
          (item.role ===
            "user" ||
            item.role ===
              "assistant") &&
          typeof item.content ===
            "string"
      )
      .slice(
        -MAX_HISTORY_ITEMS
      )
      .map(
        (item) => ({
          role:
            item.role,
          content:
            item.content
        })
      );

  form.append(
    "history",
    JSON.stringify(history)
  );

  if (selectedFile) {
    form.append(
      "file",
      selectedFile,
      selectedFile.name
    );
  }

  return form;
}

/* ============================================================
   ⏱️ FETCH WITH TIMEOUT
============================================================ */

async function fetchWithTimeout(
  url,
  options = {},
  timeout = REQUEST_TIMEOUT
) {
  activeAbortController =
    new AbortController();

  const externalSignal =
    options.signal;

  let timedOutInternally = false;

  const timer =
    setTimeout(() => {
      timedOutInternally = true;
      activeAbortController.abort();
    }, timeout);

  try {
    const response =
      await fetch(url, {
        ...options,
        signal:
          activeAbortController.signal
      });

    return response;
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      // Only our own timeout timer gets the friendly "timed out"
      // message. An abort triggered some other way (e.g. the user
      // pressing Stop before the response even arrived) rethrows
      // the original AbortError so the caller can tell the two
      // apart via error.name, instead of both looking identical.
      if (timedOutInternally) {
        throw new Error(
          "Request timed out. Please try again."
        );
      }

      throw error;
    }

    if (
      !networkOnline ||
      !navigator.onLine
    ) {
      throw new Error(
        "You appear to be offline."
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);

    activeAbortController =
      null;

    if (externalSignal) {
      /* kept for compatibility */
    }
  }
}

/* ============================================================
   🧾 API ERROR
============================================================ */

async function parseApiResponse(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof data?.error ===
        "string"
          ? data.error
          : typeof data?.text ===
            "string"
            ? data.text
            : `Server ${response.status}`;

      const error =
        new Error(errorMessage);

      error.code =
        data?.code || null;

      throw error;
    }

    return data;
  }

  const text =
    await response
      .text()
      .catch(() => "");

  if (!response.ok) {
    throw new Error(
      text ||
        `Server ${response.status}`
    );
  }

  return {
    text
  };
}

/* ============================================================
   👤 USER / USAGE SYNC
============================================================ */

async function refreshUserData() {
  /*
   * Optional endpoint.
   *
   * This intentionally fails silently because the current
   * backend may not expose /api/user yet.
   */

  try {
    const response =
      await fetch(
        `/api/user?userId=${encodeURIComponent(
          DEVICE_USER_ID
        )}`,
        {
          headers: {
            Accept:
              "application/json",

            "X-Kirong-User-Id":
              DEVICE_USER_ID
          },

          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response
        .json()
        .catch(() => null);

    if (data) {
      currentUserData =
        data;

      updatePlanBadge(
        data
      );

      updateUsageBar(
        data
      );
    }

    return data;
  } catch {
    return null;
  }
}

function updatePlanBadge(
  data
) {
  const plan =
    data?.plan ||
    data?.user?.plan ||
    data?.subscription?.plan;

  const isPro =
    String(plan)
      .toLowerCase() ===
    "pro";

  if (planBadge) {
    planBadge.textContent =
      isPro ? "Pro" : "Free";

    planBadge.classList.toggle(
      "pro",
      isPro
    );
  }

  if (usageLimitsBtn) {
    usageLimitsBtn.classList.toggle(
      "pro",
      isPro
    );
  }

  if (sidebarPlanBadge) {
    const label =
      sidebarPlanBadge.querySelector(
        "span"
      );

    const sub =
      sidebarPlanBadge.querySelector(
        "small"
      );

    if (label) {
      label.textContent =
        isPro
          ? "Pro plan"
          : "Free plan";
    }

    if (sub) {
      sub.textContent =
        isPro
          ? "Thank you 👑"
          : "Upgrade for more";
    }

    sidebarPlanBadge.classList.toggle(
      "pro",
      isPro
    );
  }
}

/* ============================================================
   📊 USAGE BAR
   ------------------------------------------------------------
   Renders the daily usage percentage inside the bar itself, and
   keeps the full snapshot (messages/images/tokens) around so
   "View usage limits" can show a detailed breakdown on demand.
   Accepts either a raw usage snapshot ({messages:{used,limit},
   images:{...}, tokens:{...}}) or a wrapper object that has one
   nested under .usage — both shapes show up depending on whether
   the data came from the streaming "done" event (chat.js's
   getUsageSnapshot() result directly) or from /api/user.
   Pro/unlimited plans (no numeric message limit) hide the bar.
============================================================ */

let lastUsageSnapshot = null;

function updateUsageBar(source) {
  const usage = source?.messages ? source : source?.usage;

  if (!usageBarWrap || !usageBarFill || !usageBarPercent) {
    return;
  }

  const messages = usage?.messages;
  const limit = Number(messages?.limit);

  if (!messages || !Number.isFinite(limit) || limit <= 0) {
    usageBarWrap.classList.add("hidden");
    lastUsageSnapshot = null;
    return;
  }

  lastUsageSnapshot = usage;

  const used = Math.max(0, Number(messages.used) || 0);
  const percent = Math.min(100, Math.round((used / limit) * 100));

  usageBarWrap.classList.remove("hidden");

  usageBarFill.style.width = percent + "%";

  usageBarFill.classList.toggle(
    "usageBarWarn",
    percent >= 70 && percent < 100
  );

  usageBarFill.classList.toggle(
    "usageBarFull",
    percent >= 100
  );

  usageBarPercent.textContent = `${percent}%`;
}

function formatUsageLimitRow(label, stat) {
  if (!stat || !Number.isFinite(Number(stat.limit))) {
    return `<div class="usageLimitsRow"><span>${escapeHTML(label)}</span><b>Unlimited</b></div>`;
  }

  const used = Math.max(0, Number(stat.used) || 0);
  const limit = Number(stat.limit);

  return (
    `<div class="usageLimitsRow"><span>${escapeHTML(label)}</span>` +
    `<b>${used} / ${limit}</b></div>`
  );
}

function openUsageLimitsModal() {
  if (!lastUsageSnapshot) {
    showToast("⚠️ Usage info isn't loaded yet");
    return;
  }

  openModal(
    `
      <h3>📊 Your Usage Today</h3>
      <p>Resets daily. Upgrade to Pro for higher limits.</p>

      <div class="modalField">
        ${formatUsageLimitRow("💬 Messages", lastUsageSnapshot.messages)}
        ${formatUsageLimitRow("🎨 Images", lastUsageSnapshot.images)}
        ${formatUsageLimitRow("🔢 Tokens", lastUsageSnapshot.tokens)}
      </div>

      <div class="modalActions">
        <button id="usageLimitsCloseBtn">Close</button>
        <button class="primaryBtn" id="usageLimitsUpgradeBtn">👑 Upgrade to Pro</button>
      </div>
    `
  );

  document
    .getElementById("usageLimitsCloseBtn")
    ?.addEventListener("click", closeModal);

  document
    .getElementById("usageLimitsUpgradeBtn")
    ?.addEventListener("click", () => {
      closeModal();
      openProPaymentModal();
    });
}

if (usageLimitsBtn) {
  usageLimitsBtn.addEventListener("click", openUsageLimitsModal);
}

/* ============================================================
   📤 SEND MESSAGE
============================================================ */

async function sendMessage() {
  if (isSending) {
    return;
  }

  userStoppedGeneration = false;

  const message =
    String(
      userInput?.value ||
        ""
    ).trim();

  if (
    !message &&
    !selectedFile
  ) {
    return;
  }

  if (
    !networkOnline ||
    !navigator.onLine
  ) {
    showToast(
      "🔴 You are offline"
    );

    return;
  }

  const attachedName =
    selectedFile?.name ||
    null;

  const visibleMessage =
    message ||
    `Please analyze file: ${attachedName}`;

  if (!currentChatId) {
    currentChatId =
      createChatId();

    localStorage.setItem(
      STORAGE_KEYS.activeChat,
      currentChatId
    );
  }

  chatBox
    ?.querySelector(".welcome-card")
    ?.remove();

  /*
   * Render user message.
   */

  addMessage(
    "user",
    message,
    attachedName
      ? {
          file:
            attachedName
        }
      : {}
  );

  addToHistory(
    "user",
    visibleMessage,
    attachedName
      ? {
          file:
            attachedName
        }
      : {}
  );

  if (userInput) {
    userInput.value =
      "";

    autoResizeInput();
  }

  setSendingState(
    true
  );

  setThinking(
    true
  );

  const wantsImage =
    !selectedFile &&
    (imageModeOn ||
      isImageRequest(
        message
      ));

  try {
    /* ========================================================
       🎨 IMAGE REQUEST
    ======================================================== */

    if (wantsImage) {
      const response =
        await fetchWithTimeout(
          IMAGE_ENDPOINT,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "X-Kirong-User-Id":
                DEVICE_USER_ID
            },

            body:
              JSON.stringify({
                prompt:
                  message,

                userId:
                  DEVICE_USER_ID
              }),

            cache:
              "no-store"
          }
        );

      const data =
        await parseApiResponse(
          response
        );

      if (
        data?.type ===
          "error" ||
        data?.ok === false
      ) {
        throw new Error(
          extractApiError(
            data
          )
        );
      }

      if (!data?.image) {
        throw new Error(
          "Image server returned no image."
        );
      }

      addImageMessage(
        data.text ||
          "🎨 Here is your image!",
        data.image,
        data.provider ||
          "",
        data.prompt ||
          message
      );

      addToHistory(
        "assistant",
        data.text ||
          "Generated image",
        {
          image:
            data.image,

          imagePrompt:
            data.prompt ||
            message,

          provider:
            data.provider
        }
      );

      /*
       * Clear attachment.
       */

      selectedFile =
        null;

      if (fileInput) {
        fileInput.value =
          "";
      }

      renderFilePreview();

      saveCurrentChat();

      return;
    }

    /* ========================================================
       💬 NORMAL CHAT REQUEST — STREAMED
       ------------------------------------------------------
       The backend responds with newline-delimited JSON (NDJSON):
       one {"type":"chunk","text":...} line per segment as Kirong
       writes the answer, then a final {"type":"done",...} or
       {"type":"error",...} line. Early rejections (limits, Pro
       gate, bad request) instead come back as a single JSON
       object with no "type" wrapper (e.g. {"ok":false,"error":...}
       or the older {"text":...} shape).

       IMPORTANT: we do NOT branch on the response's Content-Type
       header here — on some hosts/proxies it doesn't reliably
       reach the browser as set server-side. Instead we always
       read the body as a stream and parse it line-by-line,
       inferring what we got from the parsed JSON's own shape.
    ======================================================== */

    const form =
      buildFormData(
        visibleMessage
      );

    const response =
      await fetchWithTimeout(
        API_ENDPOINT,
        {
          method:
            "POST",

          body:
            form,

          headers: {
            Accept:
              "application/x-ndjson, application/json",

            "X-Kirong-User-Id":
              DEVICE_USER_ID
          },

          cache:
            "no-store"
        }
      );

    if (!response.ok && (!response.body || !response.body.getReader)) {
      // No streaming support at all AND a non-2xx status — treat
      // exactly like the old single-JSON error path.
      const data = await parseApiResponse(response);
      throw new Error(extractApiError(data));
    }

    let accumulatedText = "";
    let sawChunk = false;
    let imageEvent = null;
    let legacyEvent = null;
    let errorMessage = null;
    let errorCode = null;
    let liveMessageEl = null;
    let liveContentEl = null;

    const ensureLiveMessage = () => {
      if (liveMessageEl) return;

      liveMessageEl = addMessage("assistant", "");
      liveContentEl = liveMessageEl?.querySelector(".messageContent") || null;
    };

    const handleEvent = (event) => {
      if (!event || typeof event !== "object") return;

      if (event.type === "chunk" && typeof event.text === "string") {
        sawChunk = true;
        accumulatedText += event.text;

        ensureLiveMessage();

        if (liveContentEl) {
          liveContentEl.innerHTML = renderMarkdown(accumulatedText);
        }

        scrollToBottom();
        return;
      }

      if (event.type === "done") {
        if (event.usage) {
          updateUsageBar(event.usage);
        }
        return; // rest of the metadata (provider/model) — nothing to render
      }

      if (event.type === "error" || event.ok === false) {
        errorMessage = extractApiError(event);
        errorCode = event.code || null;
        return;
      }

      if (event.type === "image" && event.image) {
        imageEvent = event;
        return;
      }

      // No "type" field at all — the older single-shot response
      // shape ({text}/{message}/{reply}), or an unrecognized object.
      if (!event.type) {
        legacyEvent = event;
      }
    };

    if (response.body && response.body.getReader) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let event;
            try {
              event = JSON.parse(line);
            } catch {
              continue; // skip malformed/partial lines
            }

            handleEvent(event);
          }
        }

        // Flush any trailing content left in the buffer with no
        // final newline.
        if (buffer.trim()) {
          try {
            handleEvent(JSON.parse(buffer));
          } catch {
            /* ignore trailing partial line */
          }
        }
      } catch (readError) {
        if (readError?.name === "AbortError") {
          // Either the user pressed Stop, or the request hit
          // REQUEST_TIMEOUT — either way, keep whatever text has
          // already streamed in instead of discarding it. Which
          // note to attach (below) depends on which of those two
          // it was, via the userStoppedGeneration flag.
        } else {
          throw readError;
        }
      }
    } else {
      // No streaming reader available — read the whole body once
      // and process it the same way, just without live updates.
      const wholeText = await response.text();

      wholeText
        .split("\n")
        .filter((line) => line.trim())
        .forEach((line) => {
          try {
            handleEvent(JSON.parse(line));
          } catch {
            /* ignore malformed line */
          }
        });
    }

    // ----------------------------------------------------------
    // RESOLVE WHAT WE GOT
    // ----------------------------------------------------------

    if (userStoppedGeneration && !sawChunk && !imageEvent && !legacyEvent) {
      // Stopped before anything was written — quietly drop the
      // empty live bubble, no error, no assistant message needed.
      liveMessageEl?.remove();

      selectedFile = null;
      if (fileInput) fileInput.value = "";
      renderFilePreview();
      saveCurrentChat();

      return;
    }

    if (userStoppedGeneration && sawChunk) {
      accumulatedText += "\n\n⏹️ *(stopped)*";
      if (liveContentEl) {
        liveContentEl.innerHTML = renderMarkdown(accumulatedText);
      }
    } else if (errorMessage && !sawChunk && !imageEvent && !legacyEvent) {
      liveMessageEl?.remove();
      const err = new Error(errorMessage);
      if (errorCode) err.code = errorCode;
      throw err;
    } else if (errorMessage && sawChunk) {
      // Partial answer was shown, then the stream failed — keep
      // what was written and append a short note instead of
      // discarding it.
      accumulatedText += "\n\n⚠️ *(connection dropped — response may be incomplete)*";
      if (liveContentEl) {
        liveContentEl.innerHTML = renderMarkdown(accumulatedText);
      }
    }

    if (imageEvent) {
      liveMessageEl?.remove();

      addImageMessage(
        imageEvent.text || "🎨 Here is your image!",
        imageEvent.image,
        imageEvent.provider || "",
        imageEvent.prompt || visibleMessage
      );

      addToHistory("assistant", imageEvent.text || "Generated image", {
        image: imageEvent.image,
        imagePrompt: imageEvent.prompt || visibleMessage,
        provider: imageEvent.provider
      });
    } else if (sawChunk) {
      // Re-render once more through the full addMessage() markup so
      // the finished bubble gets its Copy/Listen/Retry actions, same
      // as any other assistant message.
      liveMessageEl?.remove();
      addMessage("assistant", accumulatedText || "No response received.");
      addToHistory("assistant", accumulatedText || "No response received.");

      if (voiceRepliesEnabled && accumulatedText) {
        const lastAssistant = chatBox?.querySelector(
          ".message.assistant-message:last-child .speakMessageBtn"
        );
        speakText(accumulatedText, lastAssistant);
      }
    } else if (legacyEvent) {
      const answer = String(
        legacyEvent.text || legacyEvent.message || legacyEvent.reply || "No response received."
      );

      addMessage("assistant", answer);
      addToHistory("assistant", answer);

      if (voiceRepliesEnabled) {
        const lastAssistant = chatBox?.querySelector(
          ".message.assistant-message:last-child .speakMessageBtn"
        );
        speakText(answer, lastAssistant);
      }
    } else {
      addMessage("assistant", "No response received.");
      addToHistory("assistant", "No response received.");
    }

    selectedFile = null;
    if (fileInput) fileInput.value = "";
    renderFilePreview();
    saveCurrentChat();
    refreshUserData();
  } catch (error) {
    if (userStoppedGeneration && error?.name === "AbortError") {
      // Stopped before the response even started arriving —
      // nothing to show, just stop quietly.
      return;
    }

    if (error?.code === "PRO_FEATURE") {
      const toolLabel =
        MODE_LABELS[activeMode]?.label || "This feature";

      addMessage(
        "assistant",
        `👑 ${toolLabel} is a Pro feature. Tap below to unlock it.`
      );

      addToHistory(
        "assistant",
        `Pro feature required: ${toolLabel}`
      );

      openProPaymentModal();

      return;
    }

    const message =
      friendlyError(
        error
      );

    addMessage(
      "assistant",
      `⚠️ ${message}`
    );

    addToHistory(
      "assistant",
      `Error: ${message}`
    );
  } finally {
    setThinking(
      false
    );

    setSendingState(
      false
    );

    userInput?.focus();
  }
}

/* ============================================================
   🧯 FRIENDLY ERRORS
============================================================ */

function extractApiError(
  data
) {
  if (!data) {
    return "Something went wrong.";
  }

  if (
    typeof data.error ===
    "string"
  ) {
    return data.error;
  }

  if (
    typeof data.text ===
    "string"
  ) {
    return data.text;
  }

  if (
    typeof data.message ===
    "string"
  ) {
    return data.message;
  }

  if (
    data.error &&
    typeof data.error.message ===
      "string"
  ) {
    return data.error.message;
  }

  return "Something went wrong.";
}

function friendlyError(
  error
) {
  const raw =
    String(
      error?.message ||
        error ||
        ""
    ).trim();

  if (!raw) {
    return "Connection error. Please try again.";
  }

  if (
    /failed to fetch/i.test(
      raw
    )
  ) {
    return "Unable to reach Kirong AI. Check your internet connection and try again.";
  }

  if (
    /timed out/i.test(
      raw
    )
  ) {
    return "The request took too long. Please try again.";
  }

  if (
    /429/.test(raw)
  ) {
    return "Kirong AI is busy or your usage limit was reached. Please try again later.";
  }

  if (
    /401|403/.test(raw)
  ) {
    return "This request is not authorized.";
  }

  if (
    /500|502|503|504/.test(
      raw
    )
  ) {
    return "Kirong AI server is temporarily unavailable. Please try again.";
  }

  return raw;
}

/* ============================================================
   💾 EXPORT CHAT
============================================================ */

function exportChatFile() {
  if (!messages.length) {
    showToast(
      "No chat to export"
    );

    return;
  }

  const lines =
    messages
      .map(
        (item) =>
          `${item.role === "user" ? "You" : "Kirong AI"}:\n` +
          `${item.content || ""}` +
          (item.image
            ? `\n[Image: ${
                item.imagePrompt ||
                "Generated image"
              }]`
            : "")
      )
      .join(
        "\n\n"
      );

  const content =
    `KIRONG AI CHAT EXPORT\n` +
    `====================\n\n` +
    lines;

  downloadTextFile(
    content,
    `kirong-chat-${Date.now()}.txt`,
    "text/plain"
  );

  showToast(
    "💾 Chat exported!"
  );
}

function downloadTextFile(
  content,
  filename,
  type
) {
  const blob =
    new Blob(
      [content],
      { type }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    filename;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1000
  );
}

/* ============================================================
   🧹 CLEAR CHAT
============================================================ */

if (clearChatBtn) {
  clearChatBtn.addEventListener(
    "click",
    () => {
      if (
        confirm(
          "Clear this conversation?"
        )
      ) {
        startNewChat();
      }
    }
  );
}

/* ============================================================
   📤 EXPORT CHAT
============================================================ */

if (exportChatBtn) {
  exportChatBtn.addEventListener(
    "click",
    exportChatFile
  );
}

/* ============================================================
   🗑️ CLEAR HISTORY
============================================================ */

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener(
    "click",
    () => {
      if (
        !confirm(
          "Clear ALL chat history? This cannot be undone."
        )
      ) {
        return;
      }

      removeStorage(
        STORAGE_KEYS.chats
      );

      removeStorage(
        STORAGE_KEYS.legacyChats
      );

      removeStorage(
        STORAGE_KEYS.activeChat
      );

      removeStorage(
        STORAGE_KEYS.legacyActiveChat
      );

      messages = [];

      currentChatId =
        createChatId();

      localStorage.setItem(
        STORAGE_KEYS.activeChat,
        currentChatId
      );

      showWelcome();

      renderHistoryList();

      showToast(
        "🗑️ History cleared"
      );
    }
  );
}

/* ============================================================
   📤 EXPORT HISTORY
============================================================ */

if (exportHistoryBtn) {
  exportHistoryBtn.addEventListener(
    "click",
    () => {
      let chats =
        loadJSON(
          STORAGE_KEYS.chats,
          []
        );

      if (!Array.isArray(chats)) {
        chats = [];
      }

      if (!chats.length) {
        showToast(
          "No history"
        );

        return;
      }

      downloadTextFile(
        JSON.stringify(
          chats,
          null,
          2
        ),
        `kirong-history-${Date.now()}.json`,
        "application/json"
      );

      showToast(
        "📤 History exported!"
      );
    }
  );
}

/* ============================================================
   🧰 TOOLS CLEAR
============================================================ */

if (clearToolsBtn) {
  clearToolsBtn.addEventListener(
    "click",
    () => {
      showToast(
        "🧰 Tools are ready"
      );
    }
  );
}

/* ============================================================
   🧰 TOOLS EXPORT
============================================================ */

if (exportToolsBtn) {
  exportToolsBtn.addEventListener(
    "click",
    () => {
      const tools = {
        name:
          "Kirong AI Tools",

        exportedAt:
          new Date().toISOString(),

        userId:
          DEVICE_USER_ID,

        features: [
          "Chat",
          "Projects",
          "File analysis",
          "Image generation",
          "Voice input",
          "Voice output"
        ]
      };

      downloadTextFile(
        JSON.stringify(
          tools,
          null,
          2
        ),
        `kirong-tools-${Date.now()}.json`,
        "application/json"
      );

      showToast(
        "🧰 Tools exported!"
      );
    }
  );
}

/* ============================================================
   🏗️ PROJECTS
============================================================ */

const projectsGrid =
  document.getElementById(
    "projectsGrid"
  );

const PROJECT_ICONS = {
  website: "🌐",
  cv: "📄",
  business: "💼",
  code: "💻",
  note: "📝"
};

/* ============================================================
   🪟 MODAL
============================================================ */

function openModal(
  innerHTML,
  extraClass = ""
) {
  closeModal();

  const overlay =
    document.createElement(
      "div"
    );

  overlay.className =
    "modalOverlay";

  overlay.id =
    "kirongModalOverlay";

  overlay.innerHTML =
    `<div class="modalBox ${extraClass}">` +
    innerHTML +
    `</div>`;

  overlay.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        overlay
      ) {
        closeModal();
      }
    }
  );

  document.body.appendChild(
    overlay
  );
}

function closeModal() {
  document
    .getElementById(
      "kirongModalOverlay"
    )
    ?.remove();
}

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key ===
      "Escape"
    ) {
      closeModal();
    }
  }
);

/* ============================================================
   🖼️ IMAGE LIGHTBOX
============================================================ */

function openImageLightbox(
  image,
  alt
) {
  openModal(
    `
      <button
        class="imageLightboxClose"
        id="lightboxCloseBtn"
        aria-label="Close image"
      >
        ✕
      </button>

      <img
        src="${escapeHTML(
          image
        )}"
        alt="${escapeHTML(
          alt ||
            "Generated image"
        )}"
      />
    `,
    "imageLightboxBox"
  );

  document
    .getElementById(
      "lightboxCloseBtn"
    )
    ?.addEventListener(
      "click",
      closeModal
    );
}

/* ============================================================
   ⏱️ TIME AGO
============================================================ */

function timeAgo(
  iso
) {
  if (!iso) {
    return "just now";
  }

  const time =
    new Date(
      iso
    ).getTime();

  if (
    !Number.isFinite(time)
  ) {
    return "just now";
  }

  const diff =
    Math.max(
      0,
      Date.now() - time
    );

  const minutes =
    Math.floor(
      diff / 60000
    );

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 30) {
    return `${days}d ago`;
  }

  return new Date(
    iso
  ).toLocaleDateString();
}

/* ============================================================
   📡 PROJECT API — GET
============================================================ */

async function apiFetchProjects() {
  const userId =
    DEVICE_USER_ID;

  const response =
    await fetch(
      `${PROJECTS_ENDPOINT}?userId=${encodeURIComponent(
        userId
      )}`,
      {
        headers: {
          Accept:
            "application/json",

          "X-Kirong-User-Id":
            userId
        },

        cache:
          "no-store"
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      extractApiError(data)
    );
  }

  return Array.isArray(
    data.projects
  )
    ? data.projects
    : [];
}

/* ============================================================
   ➕ PROJECT API — CREATE
============================================================ */

async function apiCreateProject({
  title,
  type,
  content
}) {
  const response =
    await fetch(
      PROJECTS_ENDPOINT,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          "X-Kirong-User-Id":
            DEVICE_USER_ID
        },

        body:
          JSON.stringify({
            userId:
              DEVICE_USER_ID,

            title,

            type,

            content
          })
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      extractApiError(data)
    );
  }

  return data.project;
}

/* ============================================================
   ✏️ PROJECT API — UPDATE
============================================================ */

async function apiUpdateProject({
  id,
  title,
  content,
  type
}) {
  const response =
    await fetch(
      PROJECTS_ENDPOINT,
      {
        method:
          "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          "X-Kirong-User-Id":
            DEVICE_USER_ID
        },

        body:
          JSON.stringify({
            userId:
              DEVICE_USER_ID,

            id,

            title,

            content,

            type
          })
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      extractApiError(data)
    );
  }

  return data.project;
}

/* ============================================================
   🗑️ PROJECT API — DELETE
============================================================ */

async function apiDeleteProject(
  id
) {
  const response =
    await fetch(
      `${PROJECTS_ENDPOINT}?id=${encodeURIComponent(
        id
      )}&userId=${encodeURIComponent(
        DEVICE_USER_ID
      )}`,
      {
        method:
          "DELETE",

        headers: {
          Accept:
            "application/json",

          "X-Kirong-User-Id":
            DEVICE_USER_ID
        }
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      extractApiError(data)
    );
  }
}

/* ============================================================
   🗂️ PROJECT CARD
============================================================ */

function renderProjectCard(
  project
) {
  const icon =
    PROJECT_ICONS[
      project.type
    ] || "📝";

  const card =
    document.createElement(
      "div"
    );

  card.className =
    "projectCard";

  card.innerHTML =
    `<span>${icon}</span>` +
    `<h3>${escapeHTML(
      project.title
    )}</h3>` +
    `<p>Updated ${timeAgo(
      project.updatedAt
    )}</p>`;

  card.addEventListener(
    "click",
    () =>
      openProjectDetail(
        project
      )
  );

  return card;
}

/* ============================================================
   🗂️ PROJECT GRID
============================================================ */

async function renderProjectsGrid() {
  if (!projectsGrid) {
    return;
  }

  projectsGrid.innerHTML =
    `
      <div
        class="projectCard new"
        id="newProjectCard"
      >
        <span>＋</span>
        <h3>New Project</h3>
        <p>Start something royal</p>
      </div>
    `;

  document
    .getElementById(
      "newProjectCard"
    )
    ?.addEventListener(
      "click",
      openNewProjectModal
    );

  try {
    const projects =
      await apiFetchProjects();

    if (!projects.length) {
      const empty =
        document.createElement(
          "p"
        );

      empty.className =
        "emptyText";

      empty.textContent =
        "No projects yet. Create your first one!";

      projectsGrid.appendChild(
        empty
      );

      return;
    }

    projects.forEach(
      (project) => {
        projectsGrid.appendChild(
          renderProjectCard(
            project
          )
        );
      }
    );
  } catch (error) {
    const empty =
      document.createElement(
        "p"
      );

    empty.className =
      "emptyText";

    empty.textContent =
      `⚠️ Could not load projects: ${friendlyError(
        error
      )}`;

    projectsGrid.appendChild(
      empty
    );
  }
}

/* ============================================================
   ✨ NEW PROJECT MODAL
============================================================ */

function openNewProjectModal() {
  openModal(
    `
      <h3>✨ New Project</h3>

      <div class="modalField">
        <label>Title</label>

        <input
          type="text"
          id="newProjTitle"
          placeholder="e.g. My Portfolio Site"
          maxlength="120"
        />
      </div>

      <div class="modalField">
        <label>Type</label>

        <select id="newProjType">
          <option value="website">
            🌐 Website
          </option>

          <option value="cv">
            📄 CV
          </option>

          <option value="business">
            💼 Business Plan
          </option>

          <option value="code">
            💻 Code Project
          </option>

          <option value="note">
            📝 Note
          </option>
        </select>
      </div>

      <div class="modalActions">
        <button
          id="modalCancelBtn"
        >
          Cancel
        </button>

        <button
          class="primaryBtn"
          id="modalCreateBtn"
        >
          Create
        </button>
      </div>
    `
  );

  document
    .getElementById(
      "newProjTitle"
    )
    ?.focus();

  document
    .getElementById(
      "modalCancelBtn"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "modalCreateBtn"
    )
    ?.addEventListener(
      "click",
      async () => {
        const title =
          document
            .getElementById(
              "newProjTitle"
            )
            ?.value.trim();

        const type =
          document
            .getElementById(
              "newProjType"
            )
            ?.value ||
          "note";

        if (!title) {
          showToast(
            "⚠️ Give your project a title"
          );

          return;
        }

        try {
          await apiCreateProject({
            title,
            type,
            content:
              ""
          });

          closeModal();

          showToast(
            "✨ Project created!"
          );

          renderProjectsGrid();
        } catch (error) {
          showToast(
            `⚠️ ${friendlyError(
              error
            )}`
          );
        }
      }
    );
}

/* ============================================================
   ✏️ PROJECT DETAIL
============================================================ */

function openProjectDetail(
  project
) {
  openModal(
    `
      <h3>
        ${
          PROJECT_ICONS[
            project.type
          ] || "📝"
        }
        ${escapeHTML(
          project.title
        )}
      </h3>

      <div class="modalField">
        <label>Title</label>

        <input
          type="text"
          id="editProjTitle"
          value="${escapeHTML(
            project.title
          )}"
          maxlength="120"
        />
      </div>

      <div class="modalField">
        <label>Content</label>

        <textarea
          id="editProjContent"
          placeholder="Project content, notes, code, draft text..."
        >${escapeHTML(
          project.content ||
            ""
        )}</textarea>
      </div>

      <div class="modalActions">

        <button
          class="dangerBtn"
          id="modalDeleteBtn"
        >
          🗑️ Delete
        </button>

        <button
          id="modalSendChatBtn"
        >
          💬 Discuss in Chat
        </button>

        <button
          class="primaryBtn"
          id="modalSaveBtn"
        >
          💾 Save
        </button>

      </div>
    `
  );

  document
    .getElementById(
      "modalSendChatBtn"
    )
    ?.addEventListener(
      "click",
      () => {
        const content =
          document
            .getElementById(
              "editProjContent"
            )
            ?.value ??
          project.content ??
          "";

        closeModal();

        document
          .querySelector(
            '.tabBtn[data-tab="chat"]'
          )
          ?.click();

        if (userInput) {
          userInput.value =
            `Here is my project "${project.title}":\n\n` +
            `${content}\n\n` +
            `Help me improve it.`;

          autoResizeInput();

          userInput.focus();
        }
      }
    );

  document
    .getElementById(
      "modalDeleteBtn"
    )
    ?.addEventListener(
      "click",
      async () => {
        if (
          !confirm(
            "Delete this project? This can't be undone."
          )
        ) {
          return;
        }

        try {
          await apiDeleteProject(
            project.id
          );

          closeModal();

          showToast(
            "🗑️ Project deleted"
          );

          renderProjectsGrid();
        } catch (error) {
          showToast(
            `⚠️ ${friendlyError(
              error
            )}`
          );
        }
      }
    );

  document
    .getElementById(
      "modalSaveBtn"
    )
    ?.addEventListener(
      "click",
      async () => {
        const title =
          document
            .getElementById(
              "editProjTitle"
            )
            ?.value.trim();

        const content =
          document
            .getElementById(
              "editProjContent"
            )
            ?.value ||
          "";

        if (!title) {
          showToast(
            "⚠️ Title can't be empty"
          );

          return;
        }

        try {
          await apiUpdateProject({
            id:
              project.id,

            title,

            content,

            type:
              project.type
          });

          closeModal();

          showToast(
            "💾 Project saved"
          );

          renderProjectsGrid();
        } catch (error) {
          showToast(
            `⚠️ ${friendlyError(
              error
            )}`
          );
        }
      }
    );
}

/* ============================================================
   ➕ NEW PROJECT BUTTON
============================================================ */

if (newProjectBtn) {
  newProjectBtn.addEventListener(
    "click",
    openNewProjectModal
  );
}

/* ============================================================
   🖼️ PHOTO EDITOR (client-side, canvas-based — no backend)
   ------------------------------------------------------------
   peBaseCanvas holds the current "baked" pixel state (after any
   applied rotate/crop/resize). Brightness/contrast/saturation and
   filter presets are applied live via ctx.filter at render time
   (non-destructive) until the user downloads, at which point the
   final render — base canvas + live filter + text overlays — is
   exported as the actual PNG.
============================================================ */

const MAX_EDITOR_DIMENSION = 1600;

const photoEditorFileInput = document.getElementById("photoEditorFileInput");
const photoEditorCard = document.getElementById("photoEditorCard");
const visionToolCard = document.getElementById("visionToolCard");

let peOriginalDataUrl = null;
let peBaseCanvas = null;
let peLive = { brightness: 100, contrast: 100, saturation: 100, preset: "none" };
let peTexts = [];
let peCropRect = null;
let peDragStart = null;
let peIsDragging = false;
let peTextPlacementArmed = false;

function peFilterCss() {
  const presetCss = {
    none: "",
    grayscale: "grayscale(100%)",
    sepia: "sepia(100%)",
    invert: "invert(100%)"
  }[peLive.preset] || "";

  return (
    `brightness(${peLive.brightness}%) ` +
    `contrast(${peLive.contrast}%) ` +
    `saturate(${peLive.saturation}%) ` +
    presetCss
  ).trim();
}

function peCreateCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function loadImageIntoEditor(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("⚠️ Choose an image file");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const img = new Image();

    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (Math.max(w, h) > MAX_EDITOR_DIMENSION) {
        const scale = MAX_EDITOR_DIMENSION / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      peOriginalDataUrl = reader.result;
      peBaseCanvas = peCreateCanvas(w, h);
      peBaseCanvas.getContext("2d").drawImage(img, 0, 0, w, h);

      peLive = { brightness: 100, contrast: 100, saturation: 100, preset: "none" };
      peTexts = [];
      peCropRect = null;

      openPhotoEditorModal();
    };

    img.onerror = () => showToast("⚠️ Could not load that image");
    img.src = reader.result;
  };

  reader.onerror = () => showToast("⚠️ Could not read that file");
  reader.readAsDataURL(file);
}

if (photoEditorCard) {
  photoEditorCard.addEventListener("click", () => photoEditorFileInput?.click());
}

if (photoEditorFileInput) {
  photoEditorFileInput.addEventListener("change", () => {
    const file = photoEditorFileInput.files?.[0];
    if (file) loadImageIntoEditor(file);
    photoEditorFileInput.value = "";
  });
}

function getCanvasPoint(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const point = evt.touches ? evt.touches[0] : evt;

  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY
  };
}

function renderPhotoEditor() {
  const canvas = document.getElementById("peCanvas");
  if (!canvas || !peBaseCanvas) return;

  canvas.width = peBaseCanvas.width;
  canvas.height = peBaseCanvas.height;

  const ctx = canvas.getContext("2d");
  ctx.filter = peFilterCss();
  ctx.drawImage(peBaseCanvas, 0, 0);
  ctx.filter = "none";

  // Text overlays (always crisp, unaffected by filters)
  peTexts.forEach((t) => {
    ctx.font = `${t.size}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = t.color;
    ctx.textBaseline = "top";
    ctx.fillText(t.text, t.xFrac * canvas.width, t.yFrac * canvas.height);
  });

  // Live crop selection overlay
  if (peCropRect) {
    ctx.save();
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = Math.max(2, canvas.width * 0.003);
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(peCropRect.x, peCropRect.y, peCropRect.w, peCropRect.h);
    ctx.fillStyle = "rgba(139,92,246,.12)";
    ctx.fillRect(peCropRect.x, peCropRect.y, peCropRect.w, peCropRect.h);
    ctx.restore();
  }

  const cropActions = document.getElementById("peCropActions");
  if (cropActions) {
    cropActions.classList.toggle("hidden", !peCropRect || peCropRect.w < 4 || peCropRect.h < 4);
  }
}

function peBindCanvasEvents() {
  const canvas = document.getElementById("peCanvas");
  if (!canvas) return;

  const start = (evt) => {
    if (!document.getElementById("peCropModeActive")?.checked) {
      if (peTextPlacementArmed) {
        const p = getCanvasPoint(canvas, evt);
        const text = document.getElementById("peTextInput")?.value.trim();

        if (text) {
          peTexts.push({
            text,
            xFrac: p.x / canvas.width,
            yFrac: p.y / canvas.height,
            size: Number(document.getElementById("peTextSize")?.value) || 32,
            color: document.getElementById("peTextColor")?.value || "#ffffff"
          });

          peTextPlacementArmed = false;
          canvas.classList.remove("placingText");
          renderPhotoEditor();
        }
      }

      return;
    }

    evt.preventDefault();
    peIsDragging = true;
    peDragStart = getCanvasPoint(canvas, evt);
    peCropRect = { x: peDragStart.x, y: peDragStart.y, w: 0, h: 0 };
  };

  const move = (evt) => {
    if (!peIsDragging) return;
    evt.preventDefault();

    const p = getCanvasPoint(canvas, evt);

    peCropRect = {
      x: Math.min(peDragStart.x, p.x),
      y: Math.min(peDragStart.y, p.y),
      w: Math.abs(p.x - peDragStart.x),
      h: Math.abs(p.y - peDragStart.y)
    };

    renderPhotoEditor();
  };

  const end = () => {
    peIsDragging = false;
  };

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);

  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);
}

function openPhotoEditorModal() {
  openModal(
    `
      <h3>🖼️ Photo Editor</h3>

      <div class="peCanvasWrap">
        <canvas id="peCanvas"></canvas>
      </div>

      <div class="peSection">
        <div class="peRow">
          <button id="peRotateLeft" type="button">↺ Rotate</button>
          <button id="peRotateRight" type="button">↻ Rotate</button>
          <button id="peResetBtn" type="button">Reset</button>
        </div>
      </div>

      <div class="peSection">
        <label class="peLabel">Brightness</label>
        <input type="range" id="peBrightness" min="0" max="200" value="100" />
        <label class="peLabel">Contrast</label>
        <input type="range" id="peContrast" min="0" max="200" value="100" />
        <label class="peLabel">Saturation</label>
        <input type="range" id="peSaturation" min="0" max="200" value="100" />
      </div>

      <div class="peSection">
        <div class="peRow peFilterRow">
          <button class="peFilterBtn active" data-preset="none" type="button">None</button>
          <button class="peFilterBtn" data-preset="grayscale" type="button">B&W</button>
          <button class="peFilterBtn" data-preset="sepia" type="button">Sepia</button>
          <button class="peFilterBtn" data-preset="invert" type="button">Invert</button>
        </div>
      </div>

      <div class="peSection">
        <label class="peLabel">Crop — drag on the image</label>
        <div class="peRow">
          <label class="peCheckLabel"><input type="checkbox" id="peCropModeActive" /> Crop mode</label>
        </div>
        <div class="peRow hidden" id="peCropActions">
          <button class="primaryBtn" id="peApplyCrop" type="button">✂️ Apply Crop</button>
          <button id="peCancelCrop" type="button">Cancel</button>
        </div>
      </div>

      <div class="peSection">
        <label class="peLabel">Add Text</label>
        <input type="text" id="peTextInput" placeholder="Type text, then tap the image to place it" />
        <div class="peRow">
          <input type="number" id="peTextSize" value="32" min="10" max="120" title="Size" />
          <input type="color" id="peTextColor" value="#ffffff" title="Color" />
          <button id="peArmText" type="button">📍 Place Text</button>
        </div>
      </div>

      <div class="peSection">
        <label class="peLabel">Resize</label>
        <div class="peRow">
          <input type="number" id="peResizeW" placeholder="Width" />
          <input type="number" id="peResizeH" placeholder="Height" />
          <button id="peApplyResize" type="button">Apply</button>
        </div>
      </div>

      <div class="modalActions">
        <button id="peCloseBtn">Close</button>
        <button class="primaryBtn" id="peDownloadBtn">⬇️ Download</button>
      </div>
    `,
    "photoEditorBox"
  );

  renderPhotoEditor();
  peBindCanvasEvents();

  document.getElementById("peCloseBtn")?.addEventListener("click", closeModal);

  document.getElementById("peRotateLeft")?.addEventListener("click", () => peRotate(-90));
  document.getElementById("peRotateRight")?.addEventListener("click", () => peRotate(90));

  document.getElementById("peResetBtn")?.addEventListener("click", () => {
    if (!peOriginalDataUrl) return;

    const img = new Image();

    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (Math.max(w, h) > MAX_EDITOR_DIMENSION) {
        const scale = MAX_EDITOR_DIMENSION / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      peBaseCanvas = peCreateCanvas(w, h);
      peBaseCanvas.getContext("2d").drawImage(img, 0, 0, w, h);
      peLive = { brightness: 100, contrast: 100, saturation: 100, preset: "none" };
      peTexts = [];
      peCropRect = null;

      document.querySelectorAll(".peFilterBtn").forEach((b) => b.classList.toggle("active", b.dataset.preset === "none"));
      ["peBrightness", "peContrast", "peSaturation"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = 100;
      });

      renderPhotoEditor();
      showToast("↩️ Reset to original");
    };

    img.src = peOriginalDataUrl;
  });

  ["peBrightness", "peContrast", "peSaturation"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (e) => {
      const key = id.replace("pe", "").toLowerCase();
      peLive[key] = Number(e.target.value);
      renderPhotoEditor();
    });
  });

  document.querySelectorAll(".peFilterBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      peLive.preset = btn.dataset.preset;
      document.querySelectorAll(".peFilterBtn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderPhotoEditor();
    });
  });

  document.getElementById("peCropModeActive")?.addEventListener("change", (e) => {
    if (!e.target.checked) {
      peCropRect = null;
      renderPhotoEditor();
    }
  });

  document.getElementById("peApplyCrop")?.addEventListener("click", () => {
    if (!peCropRect || peCropRect.w < 4 || peCropRect.h < 4 || !peBaseCanvas) return;

    const cropped = peCreateCanvas(peCropRect.w, peCropRect.h);
    cropped.getContext("2d").drawImage(
      peBaseCanvas,
      peCropRect.x, peCropRect.y, peCropRect.w, peCropRect.h,
      0, 0, peCropRect.w, peCropRect.h
    );

    peBaseCanvas = cropped;
    peCropRect = null;

    const cropCheckbox = document.getElementById("peCropModeActive");
    if (cropCheckbox) cropCheckbox.checked = false;

    renderPhotoEditor();
    showToast("✂️ Cropped");
  });

  document.getElementById("peCancelCrop")?.addEventListener("click", () => {
    peCropRect = null;
    renderPhotoEditor();
  });

  document.getElementById("peArmText")?.addEventListener("click", () => {
    const text = document.getElementById("peTextInput")?.value.trim();
    if (!text) {
      showToast("⚠️ Type some text first");
      return;
    }

    peTextPlacementArmed = true;
    document.getElementById("peCanvas")?.classList.add("placingText");
    showToast("📍 Tap the image where you want the text");
  });

  document.getElementById("peApplyResize")?.addEventListener("click", () => {
    const targetW = Number(document.getElementById("peResizeW")?.value);
    const targetH = Number(document.getElementById("peResizeH")?.value);

    if (!targetW && !targetH) {
      showToast("⚠️ Enter a width or height");
      return;
    }

    if (!peBaseCanvas) return;

    const aspect = peBaseCanvas.width / peBaseCanvas.height;
    const finalW = targetW || Math.round(targetH * aspect);
    const finalH = targetH || Math.round(targetW / aspect);

    const resized = peCreateCanvas(finalW, finalH);
    resized.getContext("2d").drawImage(peBaseCanvas, 0, 0, finalW, finalH);
    peBaseCanvas = resized;

    renderPhotoEditor();
    showToast(`↔️ Resized to ${finalW}×${finalH}`);
  });

  document.getElementById("peDownloadBtn")?.addEventListener("click", () => {
    const canvas = document.getElementById("peCanvas");
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("⚠️ Could not export image");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kirong-edit-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast("💾 Downloaded");
    }, "image/png");
  });
}

function peRotate(degrees) {
  if (!peBaseCanvas) return;

  const swap = Math.abs(degrees) === 90;
  const w = swap ? peBaseCanvas.height : peBaseCanvas.width;
  const h = swap ? peBaseCanvas.width : peBaseCanvas.height;

  const rotated = peCreateCanvas(w, h);
  const ctx = rotated.getContext("2d");

  ctx.translate(w / 2, h / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(peBaseCanvas, -peBaseCanvas.width / 2, -peBaseCanvas.height / 2);

  peBaseCanvas = rotated;
  peCropRect = null;
  renderPhotoEditor();
}

/* ============================================================
   👁️ "ASK ABOUT A PHOTO" — reuses the existing chat attach flow,
   which now supports vision on the backend for image files.
============================================================ */

if (visionToolCard) {
  visionToolCard.addEventListener("click", () => {
    document.querySelector('.tabBtn[data-tab="chat"]')?.click();

    if (userInput) {
      userInput.value = "What's in this photo?";
      autoResizeInput();
    }

    showToast("📎 Attach a photo, then send");
    fileInput?.click();
  });
}

/* ============================================================
   👑 PRO — M-PESA PAYMENT
============================================================ */

const PAYMENT_ENDPOINT = "/api/payment";
const PAYMENT_STATUS_ENDPOINT = "/api/payment-status";
const PRO_PRICE_DISPLAY = "KES 199"; // shown in the UI; the real
                                       // charged amount is decided
                                       // server-side by plans.js

function openProPaymentModal() {
  const whatsapp =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  openModal(
    `
      <h3>👑 Kirong AI Pro</h3>

      <p>Unlock the full Kirong AI experience for ${PRO_PRICE_DISPLAY}/month.</p>

      <div class="proFeatureList">
        <div>⚡ Higher daily limits</div>
        <div>🎨 More image generations</div>
        <div>📁 More file analysis</div>
        <div>💼 Business tools</div>
        <div>📱 WhatsApp Business features</div>
        <div>📝 Blog & content engine</div>
      </div>

      <div class="modalField">
        <label>M-Pesa Number</label>
        <input type="tel" id="proPhoneInput" placeholder="07XX XXX XXX" maxlength="13" />
      </div>

      <div id="proPaymentStatus" class="paymentStatus hidden"></div>

      <div class="modalActions">
        <button id="proCloseBtn">Maybe later</button>
        <button class="primaryBtn" id="proPayBtn">📲 Pay with M-Pesa</button>
      </div>

      <p class="proWhatsappFallback">
        Prefer to talk first?
        <a href="${whatsapp}" target="_blank" rel="noopener noreferrer">Chat with Kirong on WhatsApp</a>
      </p>
    `
  );

  document.getElementById("proCloseBtn")?.addEventListener("click", closeModal);
  document.getElementById("proPhoneInput")?.focus();

  document.getElementById("proPayBtn")?.addEventListener("click", initiateProPayment);
}

async function initiateProPayment() {
  const phoneInput = document.getElementById("proPhoneInput");
  const payBtn = document.getElementById("proPayBtn");
  const statusBox = document.getElementById("proPaymentStatus");

  const phone = phoneInput?.value.trim();

  if (!phone) {
    showToast("⚠️ Enter your M-Pesa number");
    return;
  }

  if (payBtn) {
    payBtn.disabled = true;
    payBtn.textContent = "Sending request...";
  }

  if (statusBox) {
    statusBox.classList.remove("hidden");
    statusBox.className = "paymentStatus pending";
    statusBox.textContent = "📲 Sending payment request...";
  }

  try {
    const response = await fetch(PAYMENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Kirong-User-Id": DEVICE_USER_ID
      },
      body: JSON.stringify({ phone, userId: DEVICE_USER_ID })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(
        response.ok
          ? extractApiError(data)
          : `${extractApiError(data)} (Server ${response.status})`
      );
    }

    if (statusBox) {
      statusBox.textContent = "📱 Check your phone and enter your M-Pesa PIN...";
    }

    if (payBtn) {
      payBtn.textContent = "Waiting for confirmation...";
    }

    await pollPaymentStatus(data.checkoutRequestId, statusBox, payBtn);
  } catch (error) {
    if (statusBox) {
      statusBox.className = "paymentStatus failed";
      statusBox.textContent = `⚠️ ${friendlyError(error)}`;
    }

    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "📲 Pay with M-Pesa";
    }
  }
}

async function pollPaymentStatus(checkoutRequestId, statusBox, payBtn) {
  const maxAttempts = 30; // ~90 seconds at 3s intervals
  const intervalMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const response = await fetch(
        `${PAYMENT_STATUS_ENDPOINT}?checkoutRequestId=${encodeURIComponent(checkoutRequestId)}`,
        {
          headers: { Accept: "application/json", "X-Kirong-User-Id": DEVICE_USER_ID },
          cache: "no-store"
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) continue; // transient — keep polling

      if (data.status === "completed") {
        if (statusBox) {
          statusBox.className = "paymentStatus success";
          statusBox.textContent = "✅ Payment received! You're now Pro 👑";
        }

        showToast("👑 Welcome to Kirong AI Pro!");
        await refreshUserData();

        setTimeout(closeModal, 1800);
        return;
      }

      if (data.status === "failed") {
        if (statusBox) {
          statusBox.className = "paymentStatus failed";
          statusBox.textContent = `⚠️ ${data.failureReason || "Payment was not completed."}`;
        }

        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = "📲 Try again";
        }

        return;
      }

      // still "pending" — keep polling
    } catch {
      // network hiccup — keep polling, don't abort the whole flow
    }
  }

  // Timed out waiting
  if (statusBox) {
    statusBox.className = "paymentStatus failed";
    statusBox.textContent =
      "⏱️ We didn't hear back in time. If you completed payment on your phone, it may still go through — check back shortly.";
  }

  if (payBtn) {
    payBtn.disabled = false;
    payBtn.textContent = "📲 Pay with M-Pesa";
  }
}

// Note: #planBadge is now a <span> nested inside #usageLimitsBtn
// (not its own clickable element), so it no longer needs its own
// click handler — usageLimitsBtn's listener (below) already covers
// this area, and the "Upgrade to Pro" path stays reachable via the
// usage-limits modal's own Upgrade button.

/* ============================================================
   🎁 REFERRAL SYSTEM — "Invite & Earn"
   ------------------------------------------------------------
   Each user's referral code IS their DEVICE_USER_ID, base64url-
   encoded by the backend — no separate signup flow needed. A
   friend opening the link with ?ref=CODE gets the code stored
   locally, then redeemed automatically (once) via POST, granting
   both sides a Pro trial per /api/referral.js's logic.
============================================================ */

const REFERRAL_ENDPOINT = "/api/referral";
const REFERRAL_PENDING_KEY = "kirong_pending_referral_v1";
const REFERRAL_REDEEMED_KEY = "kirong_referral_redeemed_v1";

const referralToolCard = document.getElementById("referralToolCard");

// --------------------------------------------------------
// 🔗 CAPTURE ?ref=CODE FROM THE URL ON FIRST LOAD
// --------------------------------------------------------

function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    if (!ref) return;

    // Never overwrite an already-redeemed state, and don't bother
    // storing a link to yourself if someone shares their own link
    // back to their own browser/device.
    if (localStorage.getItem(REFERRAL_REDEEMED_KEY)) return;

    localStorage.setItem(REFERRAL_PENDING_KEY, ref);

    // Clean the URL so refreshing/sharing it again doesn't re-post.
    params.delete("ref");
    const cleanUrl =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "") +
      window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch {
    /* localStorage/URL access can fail in some embedded contexts — ignore */
  }
}

async function redeemPendingReferral() {
  let pendingCode = null;

  try {
    if (localStorage.getItem(REFERRAL_REDEEMED_KEY)) return;
    pendingCode = localStorage.getItem(REFERRAL_PENDING_KEY);
  } catch {
    return;
  }

  if (!pendingCode) return;

  try {
    const response = await fetch(REFERRAL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Kirong-User-Id": DEVICE_USER_ID
      },
      body: JSON.stringify({ userId: DEVICE_USER_ID, code: pendingCode })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.ok) {
      try {
        localStorage.setItem(REFERRAL_REDEEMED_KEY, "true");
        localStorage.removeItem(REFERRAL_PENDING_KEY);
      } catch {}

      showToast("🎁 Referral applied — enjoy your free Pro days!");
      refreshUserData();
    } else if (data.code === "ALREADY_REDEEMED") {
      // Not this device's first redemption attempt somehow — stop
      // retrying it every load.
      try {
        localStorage.setItem(REFERRAL_REDEEMED_KEY, "true");
        localStorage.removeItem(REFERRAL_PENDING_KEY);
      } catch {}
    }
    // Any other error (e.g. own-link, invalid code): leave it stored
    // in case it was a transient network issue, but don't bother the
    // user with an error toast for something they didn't explicitly
    // trigger themselves.
  } catch {
    // network hiccup — will retry next launch since we didn't clear it
  }
}

// --------------------------------------------------------
// 🖼️ INVITE MODAL
// --------------------------------------------------------

async function openReferralModal() {
  openModal(
    `
      <h3>🎁 Invite & Earn</h3>
      <p>Give friends a free trial of Kirong AI Pro. When they join, you both get bonus Pro days 👑</p>
      <div class="modalField" id="referralLoading">
        <p class="emptyText">Loading your invite link...</p>
      </div>
    `
  );

  try {
    const response = await fetch(
      `${REFERRAL_ENDPOINT}?userId=${encodeURIComponent(DEVICE_USER_ID)}`,
      {
        headers: { Accept: "application/json", "X-Kirong-User-Id": DEVICE_USER_ID },
        cache: "no-store"
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      throw new Error(
        response.ok
          ? extractApiError(data)
          : `${extractApiError(data)} (Server ${response.status})`
      );
    }

    renderReferralModalContent(data);
  } catch (error) {
    const loadingBox = document.getElementById("referralLoading");
    if (loadingBox) {
      loadingBox.innerHTML = `<p class="emptyText">⚠️ ${friendlyError(error)}</p>`;
    }
  }
}

function renderReferralModalContent(data) {
  const modalBox = document.querySelector("#kirongModalOverlay .modalBox");
  if (!modalBox) return;

  const whatsappShareText = encodeURIComponent(
    `Karibu Kirong AI 👑 — nikualike ujaribu, umepata siku ${data.rewardDaysForNewUser} za Pro bure: ${data.link}`
  );

  modalBox.innerHTML = `
    <h3>🎁 Invite & Earn</h3>
    <p>Give friends a free trial of Kirong AI Pro. When they join, you both get bonus Pro days 👑</p>

    <div class="modalField">
      <label>Your invite link</label>
      <input type="text" id="referralLinkInput" value="${escapeHTML(data.link)}" readonly />
    </div>

    <div class="modalActions">
      <button id="referralCopyBtn">📋 Copy Link</button>
      <a class="primaryBtn" id="referralWhatsappBtn"
         href="https://wa.me/?text=${whatsappShareText}"
         target="_blank" rel="noopener noreferrer">📱 Share on WhatsApp</a>
    </div>

    <div class="proFeatureList" style="margin-top:16px">
      <div>👥 Friends invited: <b>${Number(data.referralCount) || 0}</b></div>
      <div>👑 ${
        data.trialActive
          ? `Pro trial active until ${new Date(data.proTrialUntil).toLocaleDateString()}`
          : "No active trial right now — invite someone to start earning days!"
      }</div>
    </div>

    <div class="modalActions">
      <button id="referralCloseBtn">Close</button>
    </div>
  `;

  document
    .getElementById("referralCloseBtn")
    ?.addEventListener("click", closeModal);

  document
    .getElementById("referralCopyBtn")
    ?.addEventListener("click", () => copyText(data.link));
}

if (referralToolCard) {
  referralToolCard.addEventListener("click", openReferralModal);
}

/* ============================================================
   📱 WHATSAPP HELPERS
============================================================ */

function openWhatsApp(
  number =
    WHATSAPP_NUMBER
) {
  const url =
    `https://wa.me/${number}?text=${encodeURIComponent(
      WHATSAPP_MESSAGE
    )}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

/* ============================================================
   🧠 AUTO RESIZE INPUT
============================================================ */

function autoResizeInput() {
  if (!userInput) {
    return;
  }

  userInput.style.height =
    "auto";

  userInput.style.height =
    Math.min(
      userInput.scrollHeight,
      180
    ) + "px";
}

if (userInput) {
  userInput.addEventListener(
    "input",
    autoResizeInput
  );
}

/* ============================================================
   ⌨️ KEYBOARD SHORTCUTS
============================================================ */

document.addEventListener(
  "keydown",
  (event) => {
    /*
     * Ctrl/Cmd + Enter
     */

    if (
      (event.ctrlKey ||
        event.metaKey) &&
      event.key ===
        "Enter"
    ) {
      event.preventDefault();

      if (
        !isSending
      ) {
        sendMessage();
      }
    }

    /*
     * Escape cancels current request.
     */

    if (
      event.key ===
        "Escape" &&
      isSending &&
      activeAbortController
    ) {
      stopGenerating();

      showToast(
        "⏹️ Request stopped"
      );
    }
  }
);

/* ============================================================
   🆕 NEW CHAT
============================================================ */

if (newChatBtn) {
  newChatBtn.addEventListener(
    "click",
    startNewChat
  );
}

/* ============================================================
   📤 SEND BUTTON
============================================================ */

if (sendBtn) {
  sendBtn.addEventListener(
    "click",
    () => {
      if (isSending) {
        stopGenerating();
      } else {
        sendMessage();
      }
    }
  );
}

/* ============================================================
   ↵ ENTER TO SEND
============================================================ */

if (userInput) {
  userInput.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
          "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        sendMessage();
      }
    }
  );
}

/* ============================================================
   🛠️ IMAGE MODE INIT
============================================================ */

updateImageModeBtn();

updateVoiceReplyBtn();

updateNetworkStatus();

/* ============================================================
   🌍 I18N — 5 CORE LANGUAGES (English, Swahili, French,
   Spanish, Hindi). These match the languages already used by
   getRecognitionLanguage() for voice input — restoring them
   here too, instead of the earlier EN/SW-only toggle.
============================================================ */

const LANGUAGE_NAMES = {
  English: "English",
  Swahili: "Kiswahili",
  French: "Français",
  Spanish: "Español",
  Hindi: "हिन्दी"
};

const LANGUAGE_FLAGS = {
  English: "🇬🇧",
  Swahili: "🇰🇪",
  French: "🇫🇷",
  Spanish: "🇪🇸",
  Hindi: "🇮🇳"
};

const TRANSLATIONS = {
  English: {
    statusActive: "Royal Intelligence Active",
    tabChat: "💬 Chat",
    tabProjects: "📁 Projects",
    tabTools: "🛠️ Tools",
    tabHistory: "🕘 History",
    tabMore: "✨ More",
    sidebarNewChat: "New chat",
    sidebarSearchPlaceholder: "Search chats...",
    sidebarRecents: "Recents",
    tabSchool: "🎓 School",
    coreLabel: "KIRONG AI CORE",
    welcomePrefix: "Welcome,",
    welcomeAudience: "Kings & Queens!",
    quickWebsite: "💻 Build Website",
    quickBusiness: "💡 10K Biz Idea",
    quickCv: "📄 Pro CV",
    quickLearn: "📚 Learn Fast",
    thinking: "Kirong is thinking...",
    projectsTitle: "Your Projects",
    projectsSubtitle: "All your creations in one royal vault",
    newProject: "+ New",
    toolsTitle: "Royal Tools",
    toolsSubtitle: "Superpowers for Kings & Queens",
    historyTitle: "Chat History",
    historySubtitle: "Your conversations with Kirong",
    schoolTitle: "School Mode",
    schoolSubtitle: "Learn faster with step-by-step explanations",
    actionCode: "⚡ Code",
    actionWrite: "✍️ Write",
    actionBusiness: "💼 Business",
    actionExplain: "💡 Explain",
    onboardingSkip: "Skip",
    onboardingEyebrow: "MAKE KIRONG YOURS",
    onboardingTitle: "Welcome to your royal workspace",
    onboardingSubtitle: "Choose what you want to do first. We'll use it to shape your starting experience.",
    onboardingNameLabel: "What should Kirong call you?",
    onboardingChoose: "What brings you here today?",
    roleBusiness: "Business",
    roleBusinessDesc: "Ideas, marketing & customers",
    roleSchool: "School",
    roleSchoolDesc: "Learn, revise & understand",
    roleCoding: "Coding",
    roleCodingDesc: "Build apps & solve bugs",
    roleWriting: "Writing",
    roleWritingDesc: "CVs, emails & content",
    onboardingContinue: "Enter Kirong →",
    inputPlaceholder: "Ask Kirong anything...",
    onboardingNamePlaceholder: "Your name",
    languagePickerTitle: "🌍 Choose your language"
  },

  Swahili: {
    statusActive: "Akili ya Kifalme Inatumika",
    tabChat: "💬 Ongea",
    tabProjects: "📁 Miradi",
    tabTools: "🛠️ Zana",
    tabHistory: "🕘 Historia",
    tabMore: "✨ Zaidi",
    sidebarNewChat: "Ongea Mpya",
    sidebarSearchPlaceholder: "Tafuta mazungumzo...",
    sidebarRecents: "Ya Karibuni",
    tabSchool: "🎓 Shule",
    coreLabel: "KIRONG AI CORE",
    welcomePrefix: "Karibu,",
    welcomeAudience: "Wafalme na Malkia!",
    quickWebsite: "💻 Jenga Tovuti",
    quickBusiness: "💡 Wazo la Biashara 10K",
    quickCv: "📄 CV ya Kitaalamu",
    quickLearn: "📚 Jifunze Haraka",
    thinking: "Kirong anafikiri...",
    projectsTitle: "Miradi Yako",
    projectsSubtitle: "Kazi zako zote sehemu moja",
    newProject: "+ Mpya",
    toolsTitle: "Zana za Kifalme",
    toolsSubtitle: "Uwezo maalum kwa Wafalme na Malkia",
    historyTitle: "Historia ya Mazungumzo",
    historySubtitle: "Mazungumzo yako na Kirong",
    schoolTitle: "Hali ya Shule",
    schoolSubtitle: "Jifunze haraka kwa maelezo ya hatua kwa hatua",
    actionCode: "⚡ Code",
    actionWrite: "✍️ Andika",
    actionBusiness: "💼 Biashara",
    actionExplain: "💡 Eleza",
    onboardingSkip: "Ruka",
    onboardingEyebrow: "FANYA KIRONG IWE YAKO",
    onboardingTitle: "Karibu kwenye nafasi yako ya kifalme",
    onboardingSubtitle: "Chagua unachotaka kufanya kwanza. Tutatumia hilo kuandaa mwanzo wako.",
    onboardingNameLabel: "Kirong akuite nani?",
    onboardingChoose: "Umekuja hapa kwa nini leo?",
    roleBusiness: "Biashara",
    roleBusinessDesc: "Mawazo, uuzaji na wateja",
    roleSchool: "Shule",
    roleSchoolDesc: "Jifunze, rudia na elewa",
    roleCoding: "Kuandika Code",
    roleCodingDesc: "Jenga apps na tatua matatizo",
    roleWriting: "Kuandika",
    roleWritingDesc: "CV, barua pepe na maudhui",
    onboardingContinue: "Ingia Kirong →",
    inputPlaceholder: "Uliza Kirong chochote...",
    onboardingNamePlaceholder: "Jina lako",
    languagePickerTitle: "🌍 Chagua lugha yako"
  },

  French: {
    statusActive: "Intelligence Royale Active",
    tabChat: "💬 Discuter",
    tabProjects: "📁 Projets",
    tabTools: "🛠️ Outils",
    tabHistory: "🕘 Historique",
    tabMore: "✨ Plus",
    sidebarNewChat: "Nouvelle discussion",
    sidebarSearchPlaceholder: "Rechercher des discussions...",
    sidebarRecents: "Récents",
    tabSchool: "🎓 École",
    coreLabel: "KIRONG AI CORE",
    welcomePrefix: "Bienvenue,",
    welcomeAudience: "Rois & Reines !",
    quickWebsite: "💻 Créer un site web",
    quickBusiness: "💡 Idée d'affaires 10K",
    quickCv: "📄 CV Pro",
    quickLearn: "📚 Apprendre vite",
    thinking: "Kirong réfléchit...",
    projectsTitle: "Vos Projets",
    projectsSubtitle: "Toutes vos créations dans un coffre royal",
    newProject: "+ Nouveau",
    toolsTitle: "Outils Royaux",
    toolsSubtitle: "Super-pouvoirs pour Rois & Reines",
    historyTitle: "Historique des discussions",
    historySubtitle: "Vos conversations avec Kirong",
    schoolTitle: "Mode École",
    schoolSubtitle: "Apprenez plus vite avec des explications étape par étape",
    actionCode: "⚡ Code",
    actionWrite: "✍️ Écrire",
    actionBusiness: "💼 Affaires",
    actionExplain: "💡 Expliquer",
    onboardingSkip: "Passer",
    onboardingEyebrow: "PERSONNALISEZ KIRONG",
    onboardingTitle: "Bienvenue dans votre espace royal",
    onboardingSubtitle: "Choisissez ce que vous voulez faire d'abord. Nous l'utiliserons pour adapter votre départ.",
    onboardingNameLabel: "Comment Kirong doit-il vous appeler ?",
    onboardingChoose: "Qu'est-ce qui vous amène ici aujourd'hui ?",
    roleBusiness: "Affaires",
    roleBusinessDesc: "Idées, marketing & clients",
    roleSchool: "École",
    roleSchoolDesc: "Apprendre, réviser & comprendre",
    roleCoding: "Programmation",
    roleCodingDesc: "Créer des apps & résoudre des bugs",
    roleWriting: "Écriture",
    roleWritingDesc: "CV, e-mails & contenu",
    onboardingContinue: "Entrer chez Kirong →",
    inputPlaceholder: "Demandez n'importe quoi à Kirong...",
    onboardingNamePlaceholder: "Votre nom",
    languagePickerTitle: "🌍 Choisissez votre langue"
  },

  Spanish: {
    statusActive: "Inteligencia Real Activa",
    tabChat: "💬 Chat",
    tabProjects: "📁 Proyectos",
    tabTools: "🛠️ Herramientas",
    tabHistory: "🕘 Historial",
    tabMore: "✨ Más",
    sidebarNewChat: "Nuevo chat",
    sidebarSearchPlaceholder: "Buscar chats...",
    sidebarRecents: "Recientes",
    tabSchool: "🎓 Escuela",
    coreLabel: "KIRONG AI CORE",
    welcomePrefix: "Bienvenido,",
    welcomeAudience: "¡Reyes y Reinas!",
    quickWebsite: "💻 Crear sitio web",
    quickBusiness: "💡 Idea de negocio 10K",
    quickCv: "📄 CV Profesional",
    quickLearn: "📚 Aprende rápido",
    thinking: "Kirong está pensando...",
    projectsTitle: "Tus Proyectos",
    projectsSubtitle: "Todas tus creaciones en una bóveda real",
    newProject: "+ Nuevo",
    toolsTitle: "Herramientas Reales",
    toolsSubtitle: "Superpoderes para Reyes y Reinas",
    historyTitle: "Historial de Chat",
    historySubtitle: "Tus conversaciones con Kirong",
    schoolTitle: "Modo Escuela",
    schoolSubtitle: "Aprende más rápido con explicaciones paso a paso",
    actionCode: "⚡ Código",
    actionWrite: "✍️ Escribir",
    actionBusiness: "💼 Negocio",
    actionExplain: "💡 Explicar",
    onboardingSkip: "Omitir",
    onboardingEyebrow: "HAZ KIRONG TUYO",
    onboardingTitle: "Bienvenido a tu espacio real",
    onboardingSubtitle: "Elige qué quieres hacer primero. Lo usaremos para dar forma a tu inicio.",
    onboardingNameLabel: "¿Cómo debería llamarte Kirong?",
    onboardingChoose: "¿Qué te trae por aquí hoy?",
    roleBusiness: "Negocio",
    roleBusinessDesc: "Ideas, marketing y clientes",
    roleSchool: "Escuela",
    roleSchoolDesc: "Aprende, repasa y comprende",
    roleCoding: "Programación",
    roleCodingDesc: "Crea apps y resuelve errores",
    roleWriting: "Escritura",
    roleWritingDesc: "CVs, correos y contenido",
    onboardingContinue: "Entrar a Kirong →",
    inputPlaceholder: "Pregúntale a Kirong lo que sea...",
    onboardingNamePlaceholder: "Tu nombre",
    languagePickerTitle: "🌍 Elige tu idioma"
  },

  Hindi: {
    statusActive: "शाही बुद्धिमत्ता सक्रिय",
    tabChat: "💬 चैट",
    tabProjects: "📁 प्रोजेक्ट्स",
    tabTools: "🛠️ टूल्स",
    tabHistory: "🕘 इतिहास",
    tabMore: "✨ और",
    sidebarNewChat: "नई चैट",
    sidebarSearchPlaceholder: "चैट खोजें...",
    sidebarRecents: "हाल की",
    tabSchool: "🎓 स्कूल",
    coreLabel: "KIRONG AI CORE",
    welcomePrefix: "स्वागत है,",
    welcomeAudience: "राजाओं और रानियों!",
    quickWebsite: "💻 वेबसाइट बनाएं",
    quickBusiness: "💡 10K व्यापार विचार",
    quickCv: "📄 प्रो सीवी",
    quickLearn: "📚 तेज़ी से सीखें",
    thinking: "किरोंग सोच रहा है...",
    projectsTitle: "आपके प्रोजेक्ट्स",
    projectsSubtitle: "आपकी सभी रचनाएं एक शाही तिजोरी में",
    newProject: "+ नया",
    toolsTitle: "शाही टूल्स",
    toolsSubtitle: "राजाओं और रानियों के लिए महाशक्तियां",
    historyTitle: "चैट इतिहास",
    historySubtitle: "किरोंग के साथ आपकी बातचीत",
    schoolTitle: "स्कूल मोड",
    schoolSubtitle: "चरण-दर-चरण स्पष्टीकरण के साथ तेज़ी से सीखें",
    actionCode: "⚡ कोड",
    actionWrite: "✍️ लिखें",
    actionBusiness: "💼 व्यापार",
    actionExplain: "💡 समझाएं",
    onboardingSkip: "छोड़ें",
    onboardingEyebrow: "किरोंग को अपना बनाएं",
    onboardingTitle: "आपके शाही कार्यक्षेत्र में स्वागत है",
    onboardingSubtitle: "पहले क्या करना चाहते हैं चुनें। हम इसका उपयोग आपकी शुरुआत तय करने के लिए करेंगे।",
    onboardingNameLabel: "किरोंग आपको क्या कहकर बुलाए?",
    onboardingChoose: "आज आप यहां क्यों आए हैं?",
    roleBusiness: "व्यापार",
    roleBusinessDesc: "विचार, मार्केटिंग और ग्राहक",
    roleSchool: "स्कूल",
    roleSchoolDesc: "सीखें, दोहराएं और समझें",
    roleCoding: "कोडिंग",
    roleCodingDesc: "ऐप्स बनाएं और बग ठीक करें",
    roleWriting: "लेखन",
    roleWritingDesc: "सीवी, ईमेल और सामग्री",
    onboardingContinue: "किरोंग में प्रवेश करें →",
    inputPlaceholder: "किरोंग से कुछ भी पूछें...",
    onboardingNamePlaceholder: "आपका नाम",
    languagePickerTitle: "🌍 अपनी भाषा चुनें"
  }
};

function getCurrentLanguage() {
  const lang = loadJSON(STORAGE_KEYS.language, "English");
  return TRANSLATIONS[lang] ? lang : "English";
}

function applyTranslations() {
  const lang = getCurrentLanguage();
  const dict = TRANSLATIONS[lang];

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  document.documentElement.lang =
    { English: "en", Swahili: "sw", French: "fr", Spanish: "es", Hindi: "hi" }[lang] || "en";

  if (languageBtn) {
    languageBtn.title = dict.languagePickerTitle;

    const flagSpan =
      document.getElementById(
        "languageBtnFlag"
      );

    if (flagSpan) {
      flagSpan.textContent =
        LANGUAGE_FLAGS[lang] ||
        "🇬🇧";
    }
  }

  if (userInput && !imageModeOn) {
    userInput.placeholder = dict.inputPlaceholder;
  }

  if (onboardingNameInput) {
    onboardingNameInput.placeholder = dict.onboardingNamePlaceholder;
  }
}

function openLanguagePicker() {
  const currentLang = getCurrentLanguage();
  const dict = TRANSLATIONS[currentLang];

  const optionsHtml = Object.keys(LANGUAGE_NAMES)
    .map((lang) => {
      const isActive = lang === currentLang;
      return (
        `<button class="languageOption${isActive ? " active" : ""}" data-lang="${lang}" type="button">` +
        `<span>${LANGUAGE_FLAGS[lang]}</span>` +
        `<span>${escapeHTML(LANGUAGE_NAMES[lang])}</span>` +
        (isActive ? `<span class="languageCheck">✓</span>` : "") +
        `</button>`
      );
    })
    .join("");

  openModal(
    `<h3>${escapeHTML(dict.languagePickerTitle)}</h3><div class="languageOptionsList">${optionsHtml}</div>`
  );

  document.querySelectorAll(".languageOption").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      saveJSON(STORAGE_KEYS.language, lang);
      applyTranslations();
      closeModal();
      showToast(`${LANGUAGE_FLAGS[lang]} ${LANGUAGE_NAMES[lang]}`);
    });
  });
}

if (languageBtn) {
  languageBtn.addEventListener("click", openLanguagePicker);
}

/* ============================================================
   👑 FIRST-RUN ONBOARDING
============================================================ */

const ONBOARDING_DONE_KEY = "kirong_onboarding_done_v1";
const ONBOARDING_NAME_KEY = "kirong_user_name_v1";
const ONBOARDING_ROLE_KEY = "kirong_user_role_v1";

let selectedOnboardingRole = null;

function loadStoredName() {
  try {
    return localStorage.getItem(ONBOARDING_NAME_KEY) || "";
  } catch {
    return "";
  }
}

function closeOnboarding() {
  if (!onboardingOverlay) return;
  onboardingOverlay.classList.add("hidden");
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, "true");
  } catch {}
}

function initOnboarding() {
  if (!onboardingOverlay) return;

  const alreadyDone = localStorage.getItem(ONBOARDING_DONE_KEY);
  if (alreadyDone) return;

  onboardingOverlay.classList.remove("hidden");

  // The first option ("Personal") comes pre-selected in the static
  // markup, so start from that instead of requiring a click before
  // Continue does anything useful.
  selectedOnboardingRole = "personal";

  document.querySelectorAll(".onboardingOption").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".onboardingOption")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      selectedOnboardingRole = btn.dataset.value;

      if (finishOnboardingBtn) {
        finishOnboardingBtn.disabled = false;
      }
    });
  });

  skipOnboardingBtn?.addEventListener("click", closeOnboarding);

  finishOnboardingBtn?.addEventListener("click", () => {
    const name = onboardingNameInput?.value.trim();

    if (name) {
      try {
        localStorage.setItem(ONBOARDING_NAME_KEY, name);
      } catch {}
    }

    if (selectedOnboardingRole) {
      try {
        localStorage.setItem(ONBOARDING_ROLE_KEY, selectedOnboardingRole);
      } catch {}
    }

    closeOnboarding();

    if (selectedOnboardingRole === "student") {
      setActiveMode("school");
    }

    const savedName = loadStoredName();
    if (savedName) {
      showToast(`👑 ${savedName}, karibu Kirong AI!`);
    }
  });
}

/* ============================================================
   🚀 INITIALIZATION
============================================================ */

function init() {
  captureReferralFromUrl();

  applyTranslations();

  initOnboarding();

  initTabs();

  restoreChat();

  renderHistoryList();

  renderFilePreview();

  initSpeechRecognition();

  updateImageModeBtn();

  updateVoiceReplyBtn();

  autoResizeInput();

  refreshUserData();

  redeemPendingReferral();

  console.log(
    "⚡ KIRONG AI V11 MANSION READY"
  );

  console.log(
    "👤 User ID:",
    DEVICE_USER_ID
  );

  console.log(
    "👑 Chat + Projects + History + Files + Images + Voice + Pro + i18n + Onboarding"
  );
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    init
  );
} else {
  init();
}

/* ============================================================
   🛠️ SERVICE WORKER — registered on "load" (not before) so it
   never competes with the initial page render for bandwidth/CPU.
   sw.js itself bypasses /api/* and uses stale-while-revalidate
   for the app shell, so updates roll out automatically.
============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
