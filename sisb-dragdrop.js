/* =====================================================================
   SISB AS & A LEVEL ECONOMICS — UNIVERSAL DRAG & DROP ENGINE
   =====================================================================
   Replaces the native HTML5 drag-and-drop API (which iPad/iOS Safari
   does not support for custom draggable elements) with a Pointer
   Events implementation that works identically on mouse, trackpad,
   touch (iPad/Android) and stylus.

   Include this ONE file on any activity page that has drag-sort or
   drag-match tasks, before the page's own <script>:
       <script src="sisb-dragdrop.js"></script>

   MARKUP CONVENTIONS this engine expects:
     - Draggable items carry class "item-card" or "scenario".
     - Drop zones (bins / matching slots) carry class "bin" or
       "aim-slot", and contain ONE inner container with class
       "bin-drop" or "dropped" that the item gets appended into.
     - "Return to pool" containers carry class "drop-pool".
   The engine uses event delegation, so it automatically picks up
   items created or re-shuffled after page load (e.g. on Reset).

   This is the same engine used on the IGCSE Economics site — the two
   are kept identical on purpose so a fix only has to be made once.
   ===================================================================== */
(function () {
  "use strict";

  let drag = null;

  function dropZoneAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".bin, .aim-slot") : null;
  }
  function poolZoneAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".drop-pool") : null;
  }
  function clearOver() {
    document.querySelectorAll(".bin.over, .aim-slot.over").forEach(function (s) {
      s.classList.remove("over");
    });
  }
  function eventXY(e) {
    if (e.changedTouches && e.changedTouches[0]) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  document.addEventListener(
    "pointerdown",
    function (e) {
      const item = e.target.closest(".item-card, .scenario");
      if (!item) return;
      e.preventDefault();
      const rect = item.getBoundingClientRect();
      drag = {
        el: item,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        w: rect.width,
        startParent: item.parentNode,
        startNext: item.nextSibling,
      };
      item.classList.add("dragging");
      item.style.position = "fixed";
      item.style.zIndex = 9999;
      item.style.width = rect.width + "px";
      item.style.left = rect.left + "px";
      item.style.top = rect.top + "px";
      item.style.pointerEvents = "none";
      document.body.appendChild(item);
    },
    { passive: false }
  );

  document.addEventListener(
    "pointermove",
    function (e) {
      if (!drag) return;
      drag.el.style.left = e.clientX - drag.offsetX + "px";
      drag.el.style.top = e.clientY - drag.offsetY + "px";
      clearOver();
      const zone = dropZoneAt(e.clientX, e.clientY);
      if (zone) zone.classList.add("over");
    },
    { passive: false }
  );

  function finish(e) {
    if (!drag) return;
    const item = drag.el;
    const p = eventXY(e);
    item.style.position = "";
    item.style.zIndex = "";
    item.style.left = "";
    item.style.top = "";
    item.style.width = "";
    item.style.pointerEvents = "";
    item.classList.remove("dragging");
    clearOver();

    const zone = dropZoneAt(p.x, p.y);
    const pool = poolZoneAt(p.x, p.y);

    if (zone) {
      const inner = zone.querySelector(".bin-drop, .dropped") || zone;
      inner.appendChild(item);
      item.classList.add("placed");
      item.classList.remove("correct", "wrong");
    } else if (pool) {
      pool.appendChild(item);
      item.classList.remove("placed", "correct", "wrong");
    } else if (drag.startParent) {
      // dropped somewhere invalid (off the activity area) — snap back
      drag.startParent.insertBefore(item, drag.startNext);
    }
    drag = null;
  }

  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", finish);
})();
