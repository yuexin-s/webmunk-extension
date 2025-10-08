// ===== CONFIG =====
const DAILY_CAP = 100;                    // at most N popups/day
const POPUP_ID = "webmunk-popup";       // guard to avoid duplicates

// ===== UTIL =====
const ts = () => new Date().toISOString();
const todayKey = () => "webmunk_cap_" + new Date().toISOString().slice(0,10); // e.g., 2025-10-06

const getCount = () => Number(localStorage.getItem(todayKey()) || 0);
const incCount  = () => localStorage.setItem(todayKey(), String(getCount() + 1));

function logEvent(event, arm) {
  const payload = { event, arm, url: location.href, ts: ts() };
  console.log(payload);
}

function chooseArm() {
  // Randomize each time you show; 50/50 split
  return Math.random() < 0.5 ? "H" : "S";
}

// ===== MAIN =====
(function init() {
  // avoid duplicate injection (LinkedIn is an SPA)
  if (document.getElementById(POPUP_ID)) return;

  // frequency cap
  if (getCount() >= DAILY_CAP) {
    // optional: console.info("cap reached", {count:getCount(), url: location.href});
    return;
  }

  const arm = chooseArm();

  // Build popup
  const box = document.createElement("div");
  box.id = POPUP_ID;
  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    maxWidth: "320px",
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

  // Framing text (dummy numbers OK)
  const msg = document.createElement("div");
  msg.style.marginRight = "28px";
  msg.innerHTML =
    arm === "H"
      ? "People <b>similar to you</b> often connect with profiles like this."
      : "<b>3,240 others</b> have recently connected with similar profiles.";
  box.appendChild(msg);

  // Buttons row
  const row = document.createElement("div");
  row.style.marginTop = "10px";
  row.style.display = "flex";
  row.style.gap = "8px";
  box.appendChild(row);

  const connectBtn = document.createElement("button");
  connectBtn.textContent = "Connect";
  Object.assign(connectBtn.style, {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "0",
    cursor: "pointer"
  });
  row.appendChild(connectBtn);

  // Close “×”
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
  box.appendChild(close);

  // Attach to page
  document.body.appendChild(box);

  // Count only when actually shown
  incCount();
  logEvent("popup_shown", arm);

  // Handlers
  close.addEventListener("click", () => {
    logEvent("popup_closed", arm);
    box.remove();
  });

  connectBtn.addEventListener("click", () => {
    logEvent("connect_clicked", arm);

    // (optional) try to click LinkedIn's real Connect button for UX continuity
    const real = document.querySelector('button[aria-label^="Connect"], button[aria-label*="Connect"]');
    if (real) real.click();
    box.remove();
  });
})();