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
