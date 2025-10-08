// ===============================
// Google SERP A/B Test — Hide ONLY AI Overview (Instant + Event Driven)
// ===============================

(() => {
  const POPUP_ID = "webmunk-popup";
  const DEBUG = false;

  // ---------- Basic utilities ----------
  const now = () => new Date().toISOString();
  const dbg = (...a) => { if (DEBUG) console.debug("[WM]", ...a); };
  const log = (ev, extra = {}) => console.log({ ev, url: location.href, ts: now(), ...extra });

  // Extract query text from the current URL (?q=...)
  function qParam(name) {
    try {
      return new URL(location.href).searchParams.get(name) || "";
    } catch {
      return "";
    }
  }
  const currentQuery = () => qParam("q")?.trim() || "";

  // 50/50 random assignment per query (cached in sessionStorage so it’s stable)
  function decideForQuery(q) {
    const key = "wm_google_arm_" + q;
    const cached = sessionStorage.getItem(key);
    if (cached) return cached; // "hide" or "show"
    const arm = Math.random() < 0.5 ? "hide" : "show";
    sessionStorage.setItem(key, arm);
    return arm;
  }

  // ---------- Small popup UI ----------
  function showPopup(text) {
    let box = document.getElementById(POPUP_ID);
    if (box) box.remove();
    box = document.createElement("div");
    box.id = POPUP_ID;

    // Style the popup
    Object.assign(box.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      maxWidth: "360px",
      background: "rgba(0,0,0,0.88)",
      color: "#fff",
      padding: "12px 14px",
      borderRadius: "12px",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      fontSize: "14px",
      lineHeight: "1.35",
      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
      zIndex: 2147483647
    });

    // Add message text
    const msg = document.createElement("div");
    msg.textContent = text;

    // Add close (“×”) button
    const close = document.createElement("button");
    close.textContent = "×";
    Object.assign(close.style, {
      position: "absolute",
      top: "6px",
      right: "8px",
      background: "transparent",
      border: "none",
      color: "#aaa",
      fontSize: "16px",
      cursor: "pointer"
    });
    close.onclick = () => box.remove();

    box.append(close, msg);
    document.body.appendChild(box);
  }

  // ---------- 0ms "seatbelt" CSS (instant hide for obvious cases) ----------
  function installFastCssSeatbelt() {
    if (document.getElementById("wm-ao-css")) return;
    const style = document.createElement("style");
    style.id = "wm-ao-css";
    style.textContent = `
      /* Immediately hide anything explicitly labeled AI Overview */
      :is(div,section)[aria-label="AI Overview"] { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  // ---------- Detection utilities ----------
  function hasText(el, re) {
    const t = (el?.innerText || el?.textContent || "").trim();
    return re.test(t);
  }

  function isReasonableCard(el) {
    if (!el) return false;
    if (/^(HTML|BODY|MAIN)$/i.test(el.tagName)) return false;
    if (el.id && /^(rcnt|center_col|search)$/i.test(el.id)) return false;

    const r = el.getBoundingClientRect?.() || { width: 0, height: 0 };
    if (r.width < 220 || r.height < 40) return false;
    if (r.height > 1200) return false;
    return true;
  }

  // Find anchors marking AI Overview — either aria label or heading “AI Overview”
  function findAoAnchors() {
    const anchors = new Set();

    // (1) aria-labeled elements
    document.querySelectorAll('div[aria-label="AI Overview"], section[aria-label="AI Overview"]')
      .forEach(n => anchors.add(n));

    // (2) headings named “AI Overview” or “Overview”
    const main = document.getElementById("rcnt") ||
      document.querySelector("#center_col, #search") ||
      document.body;
    main.querySelectorAll("h1, h2").forEach(h => {
      const txt = (h.textContent || "").trim().toLowerCase();
      if (txt === "ai overview" || txt === "overview") anchors.add(h);
    });

    return Array.from(anchors);
  }

  // Find the card container of the AI Overview section
  function anchorToCard(anchor) {
    let card =
      anchor.closest('div[data-hveid]') ||
      anchor.closest('div[jscontroller]') ||
      anchor;

    // Climb a few levels if necessary, but stop before reaching major containers
    for (let i = 0; i < 2 && card && !isReasonableCard(card); i++) {
      card = card.parentElement;
    }
    return isReasonableCard(card) ? card : null;
  }

  // Find “Show more” either inside or right after the AI Overview card
  function findShowMoreNear(card) {
    if (!card) return null;
    const inCard = Array.from(card.querySelectorAll('button, div[role="button"], a'))
      .find(el => hasText(el, /^\s*show more\s*$/i));
    if (inCard) return inCard;

    let sib = card.nextElementSibling;
    for (let i = 0; i < 3 && sib; i++, sib = sib.nextElementSibling) {
      if (hasText(sib, /^\s*show more\s*$/i)) return sib;
      const btn = sib.querySelector?.('button, div[role="button"], a');
      if (btn && hasText(btn, /^\s*show more\s*$/i)) return btn;
    }
    return null;
  }

  // Find a thin horizontal line (separator) after the card
  function findSeparatorAfter(card) {
    if (!card) return null;
    let sib = card.nextElementSibling;
    for (let i = 0; i < 3 && sib; i++, sib = sib.nextElementSibling) {
      if (sib.tagName === "HR") return sib;
      if (sib.getAttribute?.("role") === "separator") return sib;

      const r = sib.getBoundingClientRect?.();
      if (r && r.height > 0 && r.height <= 2 && r.width > 200) return sib;
    }
    return null;
  }

  // Hide the AI Overview card, its “Show more” button, and any divider below
  function hideAiOverviewBundle() {
    const anchors = findAoAnchors();
    let hidden = 0;
    const touched = new Set();

    anchors.forEach(a => {
      const card = anchorToCard(a);
      if (!card || touched.has(card)) return;

      // Hide the entire card block
      card.style.display = "none";
      touched.add(card);
      hidden++;

      // Hide “Show more” and divider
      const more = findShowMoreNear(card);
      if (more) more.style.display = "none";

      const sep = findSeparatorAfter(card);
      if (sep) sep.style.display = "none";
    });

    return hidden;
  }

  // ---------- Core A/B logic ----------
  function actOnSerp(preArm) {
    const mark = "wm_google_handled";
    if (document.body.dataset[mark] === "1") return;

    const q = currentQuery();
    const arm = preArm || decideForQuery(q);
    let removed = 0;

    if (arm === "hide") removed = hideAiOverviewBundle();
    document.body.dataset[mark] = "1";

    if (arm === "hide") {
      if (removed > 0) {
        log("ao_hidden", { q, removed });
        showPopup(`AI Overview hidden (Treatment)`);
      } else {
        log("ao_hide_not_found", { q });
        showPopup("AI Overview: not found");
      }
    } else {
      log("ao_shown_control", { q });
      showPopup("AI Overview shown (control)");
    }
  }

  // ---------- Handle navigation and DOM updates ----------
  function onPossibleNavChange() {
    if (!/^https:\/\/www\.google\.com\/search/i.test(location.href)) return;

    // Detect navigation (Google Search is a single-page app)
    if (!window.__wm_last_url) window.__wm_last_url = "";
    if (location.href === window.__wm_last_url) return;
    window.__wm_last_url = location.href;

    // Reset per-page state
    delete document.body.dataset.wm_google_handled;

    // Determine experiment arm immediately
    const q = currentQuery();
    const arm = decideForQuery(q);

    // Apply instant CSS hide for hide-arm
    if (arm === "hide") installFastCssSeatbelt();

    // Immediately execute main logic
    actOnSerp(arm);
  }

  // ---------- Initialization ----------
  onPossibleNavChange();

  // MutationObserver — no polling, react instantly when DOM changes
  const mo = new MutationObserver((muts) => {
    let mightHaveAO = false;
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;
        // Detect added “AI Overview” sections or headings
        if (
          n.matches?.('div[aria-label="AI Overview"], section[aria-label="AI Overview"], h1, h2') ||
          n.querySelector?.('div[aria-label="AI Overview"], section[aria-label="AI Overview"], h1, h2')
        ) {
          mightHaveAO = true;
          break;
        }
      }
      if (mightHaveAO) break;
    }

    // If new AO elements appeared, hide them immediately for hide-arm users
    if (mightHaveAO) {
      const q = currentQuery();
      if (decideForQuery(q) === "hide") {
        Promise.resolve().then(() => actOnSerp("hide"));
      }
    }

    // Also detect navigation changes
    onPossibleNavChange();
  });

  mo.observe(document.documentElement, { childList: true, subtree: true });
})();