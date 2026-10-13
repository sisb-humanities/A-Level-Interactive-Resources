/* =====================================================================
   SISB AS & A LEVEL ECONOMICS (9708) — ACTIVITY COMPLETION TRACKER
   =====================================================================
   Include this ONE file on every interactive activity page:
       <script src="sisb-tracker.js"></script>

   HOW STUDENTS ARE IDENTIFIED
   - Students log in once on SISB Economics
     (https://sisb-humanities.github.io/SISB-Econ/) with campus, class,
     name and date of birth. That login is saved in the browser and,
     because both sites are on sisb-humanities.github.io, this file can
     read it. No typed names, so every row matches the roster by email.
   - If a student has not logged in yet, the badge bottom-right says so.
     When they finish an activity, a box asks them to log in (it opens
     in a new tab). The finished activity is held on the device and sent
     automatically the moment they log in — nothing is lost.

   API (unchanged — existing activity pages need no edits)
     SISB_TRACKER.log(topic, activityLabel, detail)
     SISBTracker.log({unit|topic, activity, detail | complete+total})
     SISB_TRACKER.getName(), SISB_TRACKER.ensureName(callback)

   Rows go to the ALevel_Activity_<Campus> tab of the results sheet.
   ===================================================================== */
(function () {
  "use strict";

  // ============================== CONFIG ==============================
  const ENDPOINT  = "https://script.google.com/macros/s/AKfycbwd_lpy7Rj_ltrhuai1SktAXT-KjFFUBIbby26f3_tZiCA_Ksd5fRTp4ncM5Xdl_EPQTQ/exec";
  const COURSE    = "A Level Economics";
  const LOGIN_URL = "https://sisb-humanities.github.io/SISB-Econ/";
  // These two must match the quiz app.
  const LOGIN_KEY  = "sisb_econ_student";
  const LOGIN_DAYS = 120;
  // ====================================================================

  const QUEUE_KEY = "sisb_econ_pending_activity";
  const OLD_NAME_KEY = "sisb_alevel_econ_student_name";   // typed-name system, retired
  const loggedThisSession = new Set();
  const waitingCallbacks = [];

  function ls() {
    try { return window.localStorage; } catch (e) { return null; }
  }

  function getStudent() {
    const store = ls();
    if (!store) return null;
    try {
      const s = JSON.parse(store.getItem(LOGIN_KEY) || "null");
      if (!s || !s.email) return null;
      if (Date.now() - (s.saved_at || 0) > LOGIN_DAYS * 864e5) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  function getName() {
    const s = getStudent();
    return s ? s.full_name : "";
  }

  // ------------------------------ queue ------------------------------
  function readQueue() {
    const store = ls();
    if (!store) return [];
    try { return JSON.parse(store.getItem(QUEUE_KEY) || "[]"); } catch (e) { return []; }
  }
  function writeQueue(q) {
    const store = ls();
    if (!store) return;
    try {
      if (q.length) store.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
      else store.removeItem(QUEUE_KEY);
    } catch (e) { /* storage full or blocked — nothing more we can do */ }
  }

  function send(row, s) {
    const payload = Object.assign({}, row, {
      action: "activity",
      nickname: s.nickname,
      full_name: s.full_name,
      email: s.email,
      campus: s.campus,
      class: s.class,
      year: s.year
    });
    fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).catch(function () { /* a wifi hiccup never blocks the student */ });
  }

  // Sends anything finished before the student logged in.
  function flush() {
    const s = getStudent();
    if (!s) return;
    const q = readQueue();
    if (q.length) {
      writeQueue([]);
      q.forEach(function (row) { send(row, s); });
      showToast("✓ " + q.length + (q.length === 1 ? " activity" : " activities") + " saved for " + s.nickname);
    }
    while (waitingCallbacks.length) {
      try { waitingCallbacks.shift()(s.full_name); } catch (e) { /* activity's own callback */ }
    }
    closeModal();
    showBadge();
  }

  // ------------------------------ UI ------------------------------
  function injectStyles() {
    if (document.getElementById("sisbtrk-styles")) return;
    const css = `
    .sisbtrk-overlay{position:fixed;inset:0;background:rgba(0,47,108,.55);display:flex;
      align-items:center;justify-content:center;z-index:9999;font-family:'Lato',sans-serif;padding:16px}
    .sisbtrk-card{background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.3);
      padding:28px 26px;max-width:380px;width:100%;text-align:center}
    .sisbtrk-card h2{color:#002F6C;font-size:18px;margin:0 0 8px;font-weight:900}
    .sisbtrk-card p{color:#456080;font-size:13.5px;line-height:1.5;margin:0 0 16px}
    .sisbtrk-card button{width:100%;padding:11px;border:none;border-radius:24px;font-weight:700;
      font-size:14px;font-family:'Lato',sans-serif;cursor:pointer;margin-top:8px}
    .sisbtrk-go{background:#FF8F1C;color:#fff}
    .sisbtrk-go:hover{background:#e67d09}
    .sisbtrk-later{background:#F2F6FA;color:#456080}
    .sisbtrk-later:hover{background:#E4EDF5}
    .sisbtrk-badge{position:fixed;bottom:14px;right:14px;background:#002F6C;color:#fff;font-size:11.5px;
      font-weight:700;padding:7px 13px;border-radius:20px;box-shadow:0 2px 10px rgba(0,0,0,.25);
      z-index:500;cursor:pointer;font-family:'Lato',sans-serif;border:none}
    .sisbtrk-badge:hover{background:#003d8a}
    .sisbtrk-badge.out{background:#FF8F1C}
    .sisbtrk-badge.out:hover{background:#e67d09}
    .sisbtrk-toast{position:fixed;bottom:14px;left:50%;transform:translateX(-50%) translateY(20px);
      background:#28A745;color:#fff;font-size:13px;font-weight:700;padding:10px 18px;border-radius:24px;
      box-shadow:0 4px 16px rgba(0,0,0,.25);z-index:9998;opacity:0;transition:opacity .25s,transform .25s;
      pointer-events:none;font-family:'Lato',sans-serif;white-space:nowrap}
    .sisbtrk-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    `;
    const style = document.createElement("style");
    style.id = "sisbtrk-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showBadge() {
    if (!document.body) return;
    injectStyles();
    let badge = document.querySelector(".sisbtrk-badge");
    if (!badge) {
      badge = document.createElement("button");
      badge.type = "button";
      badge.className = "sisbtrk-badge";
      badge.addEventListener("click", function () {
        const s = getStudent();
        if (!s) { openLogin(); return; }
        if (window.confirm("Logged in as " + s.full_name + " (" + s.class + ").\n\nNot you? Press OK to change student.")) {
          openLogin();
        }
      });
      document.body.appendChild(badge);
    }
    const s = getStudent();
    badge.classList.toggle("out", !s);
    badge.textContent = s ? "👤 " + s.nickname : "👤 Log in to save progress";
    badge.title = s ? "Click to change student" : "Log in once to save your progress";
  }

  function showToast(msg) {
    if (!document.body) return;
    injectStyles();
    let t = document.querySelector(".sisbtrk-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "sisbtrk-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add("show"); });
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function () { t.classList.remove("show"); }, 2800);
  }

  function openLogin() {
    const url = LOGIN_URL + "?return=" + encodeURIComponent(location.href);
    const w = window.open(url, "_blank");
    if (!w) location.href = url;   // pop-up blocked: go there directly (queued work is kept)
  }

  function closeModal() {
    const m = document.querySelector(".sisbtrk-overlay");
    if (m) m.remove();
  }

  function showLoginModal() {
    if (document.querySelector(".sisbtrk-overlay") || !document.body) return;
    injectStyles();
    const overlay = document.createElement("div");
    overlay.className = "sisbtrk-overlay";
    overlay.innerHTML =
      '<div class="sisbtrk-card">' +
      "<h2>Log in to save your progress</h2>" +
      "<p>Nice work. To record it, log in once on <b>SISB Economics</b> with your class and date of birth. " +
      "It opens in a new tab, and this activity is saved automatically as soon as you're logged in.</p>" +
      '<button class="sisbtrk-go" type="button">Log in →</button>' +
      '<button class="sisbtrk-later" type="button">Not now</button>' +
      "</div>";
    document.body.appendChild(overlay);
    overlay.querySelector(".sisbtrk-go").addEventListener("click", openLogin);
    overlay.querySelector(".sisbtrk-later").addEventListener("click", closeModal);
  }

  // ------------------------------ API ------------------------------
  function ensureName(callback) {
    const s = getStudent();
    if (s) { callback(s.full_name); return; }
    if (typeof callback === "function") waitingCallbacks.push(callback);
    showLoginModal();
  }

  function log(topic, activity, detail) {
    const key = topic + "::" + activity;
    if (loggedThisSession.has(key)) return;   // one row per activity per visit
    loggedThisSession.add(key);

    const row = {
      timestamp: new Date().toISOString(),
      course: COURSE,
      topic: String(topic || ""),
      activity: String(activity || ""),
      detail: detail == null ? "" : String(detail),
      page: location.pathname
    };

    const s = getStudent();
    if (s) {
      send(row, s);
      showToast("✓ Progress saved for " + s.nickname);
    } else {
      const q = readQueue();
      q.push(row);
      writeQueue(q);
      showLoginModal();
    }
  }

  // ------------------------------ start ------------------------------
  // Another tab (the login page) saving the login fires this event here.
  window.addEventListener("storage", function (e) {
    if (e.key === LOGIN_KEY) { flush(); showBadge(); }
  });
  // Fallback for browsers that are slow to fire the storage event.
  window.addEventListener("focus", flush);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") flush();
  });

  function start() {
    const store = ls();
    if (store) { try { store.removeItem(OLD_NAME_KEY); } catch (e) { /* ignore */ } }
    showBadge();
    flush();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.SISB_TRACKER = { log: log, getName: getName, ensureName: ensureName };

  // Alias for activities built with the {unit, activity, complete, total}
  // object-call convention — normalises onto the same log() above.
  window.SISBTracker = {
    log: function (opts) {
      opts = opts || {};
      let detail = opts.detail;
      if (detail == null && opts.complete != null && opts.total != null) {
        detail = opts.complete + "/" + opts.total + " sections done";
      }
      log(opts.unit || opts.topic, opts.activity, detail || "");
    },
    getName: getName,
    ensureName: ensureName
  };
})();
