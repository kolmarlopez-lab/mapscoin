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
  if (!scrollEl || !main || !rays) return;

  var reduced = false;
  try {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    void e;
  }

  /* Растяжение лучей пропорционально «натягу» листа: смещение пальца линейно к scale, опорная величина — высота героя.
     Слушатели на .game-main в capture: у .game-sheet pointer-events: none — касания часто не бьют в .game-scroll. */
  var touchStartY = 0;
  var gesture = false;
  var didStretch = false;

  /** Доля прироста масштаба, если сместить палец вниз на высоту героя (например 0.12 → +12% при pull = height). */
  var stretchPerHeroHeight = 0.12;
  var maxScaleDelta = 0.22;

  function heroHeightPx() {
    var h = hero ? hero.getBoundingClientRect().height : 0;
    return h > 48 ? h : 320;
  }

  function scaleForPull(pullPx) {
    if (pullPx <= 0) return 1;
    var h = heroHeightPx();
    var delta = (pullPx / h) * stretchPerHeroHeight;
    if (delta > maxScaleDelta) delta = maxScaleDelta;
    return 1 + delta;
  }

  function setRaysTransform(scale) {
    rays.style.transform = "translateX(-50%) scale(" + scale + ")";
  }

  function endGesture() {
    gesture = false;
    if (reduced) return;
    rays.classList.remove("game-hero__rays--pulling");
    if (didStretch) {
      didStretch = false;
      setRaysTransform(1);
    } else {
      rays.style.transform = "";
    }
  }

  function inScrollViewport(clientX, clientY) {
    var r = scrollEl.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }

  function isHeaderChrome(el) {
    if (!el || !el.closest) return false;
    return !!(el.closest(".game-header-basic") || el.closest(".game-header-new"));
  }

  function onTouchStart(e) {
    if (reduced) return;
    if (scrollEl.scrollTop > 1) return;
    if (!e.touches || !e.touches.length) return;
    var t = e.touches[0];
    if (!inScrollViewport(t.clientX, t.clientY)) return;
    if (isHeaderChrome(e.target)) return;
    touchStartY = t.clientY;
    gesture = true;
    didStretch = false;
  }

  function onTouchMove(e) {
    if (reduced || !gesture) return;
    if (!e.touches || !e.touches.length) return;
    var t = e.touches[0];
    if (!inScrollViewport(t.clientX, t.clientY)) {
      endGesture();
      return;
    }
    if (scrollEl.scrollTop > 2) {
      endGesture();
      return;
    }
    var pull = t.clientY - touchStartY;
    if (pull > 0) {
      didStretch = true;
      rays.classList.add("game-hero__rays--pulling");
      setRaysTransform(scaleForPull(pull));
    } else if (didStretch) {
      rays.classList.remove("game-hero__rays--pulling");
      setRaysTransform(1);
    }
  }

  function onTouchEnd() {
    if (!gesture) return;
    endGesture();
  }

  main.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
  main.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
  main.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
  main.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true });

  scrollEl.addEventListener(
    "scroll",
    function () {
      if (scrollEl.scrollTop > 2) {
        rays.classList.remove("game-hero__rays--pulling");
        rays.style.transform = "";
        gesture = false;
        didStretch = false;
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
