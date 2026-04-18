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
