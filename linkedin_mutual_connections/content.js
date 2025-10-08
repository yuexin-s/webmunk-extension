// ===============================
// Webmunk content.js — LinkedIn mutuals row A/B
// ===============================
(() => {
    // ---- CONFIG ----
    const POPUP_ID = "webmunk-popup";
    const DECISION_CACHE_PREFIX = "wm_decision_";  // per-profile decision cache
    const URL_POLL_MS = 800;                       // SPA safety net
    const RENDER_DELAY_MS = 450;                   // let LinkedIn render
    const DEBUG = false;
  
    // ---- UTIL ----
    const ts = () => new Date().toISOString();
    const profileId = () => (location.pathname.match(/\/in\/([^\/?#]+)/)?.[1] ?? location.href);
    const log = (ev, extra = {}) => console.log({ ev, url: location.href, ts: ts(), ...extra });
    const dbg = (...args) => { if (DEBUG) console.debug("[WM]", ...args); };
  
    // Stable 50/50 per profile (cached for the tab session)
    function decideDelete() {
      const key = DECISION_CACHE_PREFIX + profileId();
      const cached = sessionStorage.getItem(key);
      if (cached) return cached === "delete";
      const d = Math.random() < 0.5 ? "delete" : "keep";
      sessionStorage.setItem(key, d);
      return d === "delete";
    }
  
    // Single-popup helper
    function showPopup(text) {
      let box = document.getElementById(POPUP_ID);
      if (box) box.remove();
      box = document.createElement("div");
      box.id = POPUP_ID;
      Object.assign(box.style, {
        position: "fixed", bottom: "20px", right: "20px", maxWidth: "360px",
        background: "rgba(0,0,0,0.88)", color: "#fff", padding: "12px 14px",
        borderRadius: "12px", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
        fontSize: "14px", lineHeight: "1.35", boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        zIndex: 2147483647
      });
      const msg = document.createElement("div"); msg.textContent = text;
      const close = document.createElement("button"); close.textContent = "×";
      Object.assign(close.style, {
        position: "absolute", top: "6px", right: "8px",
        background: "transparent", border: "none", color: "#aaa",
        fontSize: "16px", cursor: "pointer"
      });
      close.onclick = () => box.remove();
      box.append(close, msg);
      document.body.appendChild(box);
    }
  
    // ---- DETECTION ----
    function looksLikeMutualsAnchor(a) {
        const href = (a.getAttribute("href") || "").toLowerCase();
        // Use href signals (your samples have all three):
        return (
          href.includes("member_profile_canned_search") &&
          href.includes("facetnetwork") &&
          href.includes("facetconnectionof")
        );
      }
      
      function findMutualBlocks() {
        // Collect real <a> nodes (NOT the inner span)
        const anchors = Array.from(
          document.querySelectorAll('a[data-test-app-aware-link], a[href*="MEMBER_PROFILE_CANNED_SEARCH"]')
        ).filter(looksLikeMutualsAnchor);
      
        // Also catch the span.hoverable-link-text case by climbing to its <a>
        document.querySelectorAll("span.hoverable-link-text").forEach(sp => {
          const a = sp.closest("a");
          if (a && looksLikeMutualsAnchor(a) && !anchors.includes(a)) anchors.push(a);
        });
      
        return anchors;
      }  
  
    // ---- HELPERS FOR SAFE HIDING ----
    function looksLikeAvatarStack(el) {
      if (!el) return false;
      if (/\bivm-image-view-model\b/.test(el.className || "")) return true;
      const imgs = el.querySelectorAll?.("img");
      if (!imgs || !imgs.length || imgs.length > 8) return false;
      let small = 0;
      imgs.forEach(img => {
        const r = img.getBoundingClientRect?.() || { width: 0, height: 0 };
        if (r.width && r.height && r.width <= 48 && r.height <= 48) small++;
      });
      if (small >= 1 && small === imgs.length) {
        const style = window.getComputedStyle(el);
        return /(inline|inline-flex|inline-block|flex)/.test(style.display);
      }
      return false;
    }
  
    // prefer li; else the smallest row-like parent; never escalate to large containers
    function pickRowContainer(link) {
      const li = link.closest("li");
      if (li) return li;
      let p = link.parentElement;
      for (let i = 0; i < 3 && p; i++) {
        const style = window.getComputedStyle(p);
        const rowish = /(flex|grid|inline-flex)/.test(style.display);
        const bigTag = /^(MAIN|SECTION|HEADER|FOOTER|BODY)$/i.test(p.tagName);
        if (rowish && !bigTag) return p;
        p = p.parentElement;
      }
      return link;
    }
  
    // Only fold li if it's truly empty after hiding link + avatars
    function maybeFoldLi(li) {
        if (!li) return;
        const stillInteractive =
          li.querySelector('a:not([style*="display: none"])') ||
          li.querySelector('button:not([style*="display: none"])');
        const visibleText = (li.innerText || "").replace(/\s+/g, " ").trim();
        const h = li.getBoundingClientRect().height;
        if (!stillInteractive && visibleText.length <= 4 && h <= 120) {
          li.style.display = "none";
        }
      }
      
      function removeMutualRow(anchor) {
        // 1) remove the avatar stack right next to it (prev sibling), or inside same container
        const container = anchor.parentElement;
        const prev = container?.previousElementSibling;
        if (looksLikeAvatarStack(prev)) prev.remove();
        const inside = container?.querySelector(".ivm-image-view-model");
        if (looksLikeAvatarStack(inside)) inside.remove();
      
        // 2) remove the actual <a> (don’t just hide)
        anchor.replaceWith(document.createComment("wm-mutuals-removed"));
      
        // 3) fold only the immediate <li> when it’s clearly empty
        maybeFoldLi(container?.closest("li"));
      
        return true;
      }
      
  
    // ---- ACTION ----
    function actOnMutuals() {
      const mark = "wm_mutuals_handled";
      if (document.body.dataset[mark] === "1") return;
  
      const shouldDelete = decideDelete();
      const links = findMutualBlocks();
  
      if (shouldDelete && links.length) {
        let removedAny = false;
        links.forEach(link => { if (removeMutualRow(link)) removedAny = true; });
        document.body.dataset[mark] = "1";
        if (removedAny) {
          log("mutuals_deleted_whole_block", { profile: profileId(), count: links.length });
          showPopup("Deleted: mutual connections block");
        } else {
          log("mutuals_not_found", { profile: profileId() });
          showPopup("Not deleted (not found)");
        }
      } else {
        document.body.dataset[mark] = "1";
        log("mutuals_not_deleted", { profile: profileId(), reason: shouldDelete ? "not_found" : "control" });
        showPopup(shouldDelete ? "Not deleted (not found)" : "Not deleted (control)");
      }
    }
  
    // ---- SPA HANDLING ----
    function runOncePerURL() {
      if (!window.__wm_last_url) window.__wm_last_url = "";
      if (location.href === window.__wm_last_url) return;
      window.__wm_last_url = location.href;
  
      delete document.body.dataset.wm_mutuals_handled; // reset idempotence for new URL
      setTimeout(actOnMutuals, RENDER_DELAY_MS);
    }
  
    // ---- INIT ----
    runOncePerURL();
    const obs = new MutationObserver(() => runOncePerURL());
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(runOncePerURL, URL_POLL_MS);
  })();