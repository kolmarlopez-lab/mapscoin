(function initGameScrollHeroPad() {
  "use strict";
  const main = document.querySelector(".game-main");
  const hero = document.querySelector(".game-hero");
  const scrollEl = document.querySelector(".game-scroll");
  if (!main || !hero || !scrollEl) return;

  /* Не height героя: верх героя выше .game-main из‑за margin-top, иначе padding-top
     завышается и между низом лучей и белым остаётся синяя полоса */
  function syncHeroHeight() {
    var mt = main.getBoundingClientRect().top;
    var h = hero.getBoundingClientRect().bottom - mt;
    if (h < 1) return;
    scrollEl.style.setProperty("--game-hero-h", h.toFixed(2) + "px");
    window.dispatchEvent(new CustomEvent("gameHeroPadUpdated"));
  }

  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(function () {
      syncHeroHeight();
    });
    ro.observe(hero);
    ro.observe(main);
  } else {
    window.addEventListener("resize", syncHeroHeight, { passive: true });
  }
  window.addEventListener("load", syncHeroHeight, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      syncHeroHeight();
    });
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(syncHeroHeight);
  });
})();

(function initGameHeroRaysPullStretch() {
  "use strict";
  var scrollEl = document.querySelector(".game-scroll");
  var main = document.querySelector(".game-main");
  var hero = document.querySelector(".game-hero");
  var rays = document.querySelector(".game-hero__rays");
  var raysImg = document.querySelector(".game-hero__rays-img");
  if (!scrollEl || !main || !rays || !raysImg) return;

  var reduced = false;
  try {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    void e;
  }

  /* Растягивание .game-hero__rays-img: scale(sx,sy). Pointer Events — тач + мышь; только touch на десктопе не срабатывает.
     capture + setPointerCapture — жест не теряется из‑за pointer-events у листа. */
  var startY = 0;
  var gesture = false;
  var didStretch = false;
  var activePointerId = -1;
  var hasPointer = typeof window.PointerEvent !== "undefined";

  var stretchPerHeroHeight = 0.22;
  var maxStretchDelta = 0.42;
  var stretchYFactor = 1;
  var stretchXFactor = 0.38;

  function heroHeightPx() {
    var h = hero ? hero.getBoundingClientRect().height : 0;
    return h > 48 ? h : 320;
  }

  function stretchForPull(pullPx) {
    if (pullPx <= 0) return { sx: 1, sy: 1 };
    var h = heroHeightPx();
    var delta = (pullPx / h) * stretchPerHeroHeight;
    if (delta > maxStretchDelta) delta = maxStretchDelta;
    return {
      sx: 1 + delta * stretchXFactor,
      sy: 1 + delta * stretchYFactor,
    };
  }

  function setRaysImgTransform(sx, sy) {
    raysImg.style.transform = "scale(" + sx + ", " + sy + ")";
  }

  function releaseActivePointer() {
    if (activePointerId >= 0 && hasPointer && typeof main.releasePointerCapture === "function") {
      try {
        if (typeof main.hasPointerCapture === "function" && main.hasPointerCapture(activePointerId)) {
          main.releasePointerCapture(activePointerId);
        }
      } catch (err) {
        void err;
      }
    }
    activePointerId = -1;
  }

  function endGesture() {
    gesture = false;
    releaseActivePointer();
    if (reduced) return;
    rays.classList.remove("game-hero__rays--pulling");
    raysImg.style.willChange = "";
    if (didStretch) {
      didStretch = false;
      setRaysImgTransform(1, 1);
    } else {
      raysImg.style.transform = "";
    }
  }

  function inScrollViewport(clientX, clientY) {
    var r = scrollEl.getBoundingClientRect();
    var pad = 24;
    return (
      clientX >= r.left - pad &&
      clientX <= r.right + pad &&
      clientY >= r.top - pad &&
      clientY <= r.bottom + pad
    );
  }

  function isHeaderChrome(el) {
    if (!el || !el.closest) return false;
    return !!(el.closest(".game-header-basic") || el.closest(".game-header-new"));
  }

  /** Иначе setPointerCapture(main) забирает указатель — кнопки «Получить» и др. не получают click */
  function isInteractiveTarget(el) {
    if (!el || !el.closest) return false;
    if (el.closest("button, a[href], input, select, textarea, label, [role='button'], [contenteditable='true']")) {
      return true;
    }
    if (
      el.closest(
        ".js-task-claim, .js-award-claim, .award-card__link, .daily-cta, .task-tabs__tab, [data-task]"
      )
    ) {
      return true;
    }
    return false;
  }

  function applyPull(clientY) {
    if (scrollEl.scrollTop > 2) {
      endGesture();
      return;
    }
    var pull = clientY - startY;
    if (pull > 0) {
      didStretch = true;
      rays.classList.add("game-hero__rays--pulling");
      raysImg.style.willChange = "transform";
      var st = stretchForPull(pull);
      setRaysImgTransform(st.sx, st.sy);
    } else if (didStretch) {
      rays.classList.remove("game-hero__rays--pulling");
      setRaysImgTransform(1, 1);
    }
  }

  function onPointerDown(e) {
    if (reduced) return;
    if (!e.isPrimary) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (scrollEl.scrollTop > 1) return;
    if (!inScrollViewport(e.clientX, e.clientY)) return;
    if (isHeaderChrome(e.target)) return;
    if (isInteractiveTarget(e.target)) return;
    startY = e.clientY;
    gesture = true;
    didStretch = false;
    activePointerId = e.pointerId;
    try {
      main.setPointerCapture(e.pointerId);
    } catch (err) {
      void err;
    }
  }

  function onPointerMove(e) {
    if (!gesture || !hasPointer) return;
    if (e.pointerId !== activePointerId) return;
    if (e.pointerType === "mouse" && (e.buttons & 1) === 0) {
      endGesture();
      return;
    }
    applyPull(e.clientY);
  }

  function onPointerUp(e) {
    if (!hasPointer) return;
    if (e.pointerId !== activePointerId) return;
    endGesture();
  }

  function onTouchStart(e) {
    if (hasPointer) return;
    if (reduced) return;
    if (scrollEl.scrollTop > 1) return;
    if (!e.touches || !e.touches.length) return;
    var t = e.touches[0];
    if (!inScrollViewport(t.clientX, t.clientY)) return;
    if (isHeaderChrome(e.target)) return;
    if (isInteractiveTarget(e.target)) return;
    startY = t.clientY;
    gesture = true;
    didStretch = false;
  }

  function onTouchMove(e) {
    if (hasPointer) return;
    if (reduced || !gesture) return;
    if (!e.touches || !e.touches.length) return;
    applyPull(e.touches[0].clientY);
  }

  function onTouchEnd() {
    if (hasPointer) return;
    if (!gesture) return;
    endGesture();
  }

  if (hasPointer) {
    main.addEventListener("pointerdown", onPointerDown, { capture: true });
    main.addEventListener("pointermove", onPointerMove, { capture: true });
    main.addEventListener("pointerup", onPointerUp, { capture: true });
    main.addEventListener("pointercancel", onPointerUp, { capture: true });
  } else {
    main.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    main.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    main.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    main.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true });
  }

  scrollEl.addEventListener(
    "scroll",
    function () {
      if (scrollEl.scrollTop > 2) {
        rays.classList.remove("game-hero__rays--pulling");
        raysImg.style.transform = "";
        raysImg.style.willChange = "";
        gesture = false;
        didStretch = false;
        releaseActivePointer();
      }
    },
    { passive: true }
  );
})();

(function initGameHeaderScrolledState() {
  "use strict";
  const scrollEl = document.querySelector(".game-scroll");
  const headerNew = document.querySelector(".game-header-new");
  if (!scrollEl || !headerNew) return;

  function setScrolled(scrolled) {
    headerNew.classList.toggle("game-header-new--visible", scrolled);
    headerNew.setAttribute("aria-hidden", scrolled ? "false" : "true");
  }

  /* new header: когда верх белого листа начинает уходить за край экрана */
  function frostThreshold() {
    var pad = parseFloat(getComputedStyle(scrollEl).paddingTop) || 0;
    var sheet = document.querySelector(".game-sheet");
    var pull = 0;
    if (sheet) {
      pull = Math.abs(parseFloat(getComputedStyle(sheet).marginTop)) || 0;
    }
    return Math.max(0, pad - pull);
  }

  function sync() {
    var th = frostThreshold();
    setScrolled(scrollEl.scrollTop >= th - 0.5);
  }

  scrollEl.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });
  window.addEventListener("gameHeroPadUpdated", sync, { passive: true });
  sync();
})();

(function () {
  "use strict";

  const tablist = document.querySelector('.task-tabs__track[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = [
    document.getElementById("task-panel-available"),
    document.getElementById("task-panel-done"),
  ];

  function selectIndex(i) {
    const idx = i === 1 ? 1 : 0;
    tabs.forEach((t, j) => {
      const on = j === idx;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, j) => {
      if (!p) return;
      if (j === idx) {
        p.hidden = false;
      } else {
        p.hidden = true;
      }
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", function () {
      selectIndex(i);
    });
  });

  selectIndex(0);
})();
