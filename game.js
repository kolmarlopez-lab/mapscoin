(function initGameHeaderScrolledState() {
  "use strict";
  const inner = document.querySelector(".game__inner");
  const header = document.querySelector(".game-header");
  const sentinel = document.querySelector(".game-header-scroll-sentinel");
  if (!inner || !header || !sentinel) return;

  function setScrolled(scrolled) {
    header.classList.toggle("game-header--scrolled", scrolled);
  }

  if (typeof IntersectionObserver !== "undefined") {
    const headerOffset = parseInt(
      String(getComputedStyle(inner).getPropertyValue("--game-header-offset") || "64").trim(),
      10
    ) || 64;
    /* Исключаем зону липкой шапки: иначе сентинел «пересекает» root, будучи под шапкой, и класс не включается */
    const topInset = `-${headerOffset}px`;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        /* Пока сентинел попадает в область под шапкой — верх; иначе — скроллили */
        setScrolled(!entry.isIntersecting);
      },
      { root: inner, rootMargin: `${topInset} 0px 0px 0px`, threshold: 0 }
    );
    io.observe(sentinel);
  } else {
    const THRESHOLD = 2;
    function sync() {
      setScrolled(inner.scrollTop > THRESHOLD);
    }
    inner.addEventListener("scroll", sync, { passive: true });
    sync();
  }
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
