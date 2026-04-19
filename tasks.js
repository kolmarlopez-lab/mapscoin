(function () {
  "use strict";

  try {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  } catch (e) {
    void e;
  }

  const TIT =
    "Несколько раз в неделю открывайте карточки кофеен — любые точки на карте";

  /** Дополнительные одношаговые задания (как bonus): клик по карточке → готово → «Получить». */
  const EXTRA_TASK_KEYS = ["extra1"];

  const EXTRA_REWARD = {
    extra1: 25,
  };

  function isExtraTask(key) {
    return EXTRA_REWARD.hasOwnProperty(key);
  }

  function extraReward(key) {
    var n = EXTRA_REWARD[key];
    return typeof n === "number" ? n : 0;
  }

  /** Многоэтапные задания: клик по карточке → «Получить» за текущий этап; после последнего — в «Выполненные». */
  const MULTI_TASK_KEYS = ["milestone", "multi1"];

  const MULTI_STEPS = {
    milestone: [10, 20, 30],
    multi1: [10, 10, 10, 10, 10, 10, 20],
  };

  function isMultiTask(key) {
    return Object.prototype.hasOwnProperty.call(MULTI_STEPS, key);
  }

  /** Сумма баллов по всем заданиям недели (spotlight + extra + multi + bonus) — для шапки «заработано / максимум». */
  function computeWeeklyTasksMaxPoints() {
    var sum = 100 + 40;
    var i, j;
    for (i = 0; i < EXTRA_TASK_KEYS.length; i++) {
      sum += extraReward(EXTRA_TASK_KEYS[i]);
    }
    for (i = 0; i < MULTI_TASK_KEYS.length; i++) {
      var steps = MULTI_STEPS[MULTI_TASK_KEYS[i]];
      for (j = 0; j < steps.length; j++) sum += steps[j];
    }
    return sum;
  }

  if (typeof window !== "undefined") {
    window.gameWeeklyTasksMaxPoints = computeWeeklyTasksMaxPoints();
  }

  /** Задания недели, которые нужно выполнить для главного задания (порядок не влияет на полоски — считаем только число). */
  var SPOTLIGHT_DEP_KEYS = EXTRA_TASK_KEYS.concat(MULTI_TASK_KEYS).concat(["bonus"]);

  function isWeeklyDepDone(key) {
    var st = S[key];
    if (!st) return false;
    if (isExtraTask(key) || key === "bonus") return st.s === "claimed";
    if (isMultiTask(key)) return st.s === "claimed";
    return false;
  }

  function countWeeklyDepsDone() {
    var n = 0;
    var i;
    for (i = 0; i < SPOTLIGHT_DEP_KEYS.length; i++) {
      if (isWeeklyDepDone(SPOTLIGHT_DEP_KEYS[i])) n += 1;
    }
    return n;
  }

  function refreshSpotlight() {
    var art = document.querySelector('article[data-task="spotlight"]');
    if (!art || S.spotlight.s === "claimed") return;
    var done = countWeeklyDepsDone();
    var total = SPOTLIGHT_DEP_KEYS.length;
    if (done >= total) S.spotlight.s = "ready";
    else S.spotlight.s = "active";
    renderSpotlight(art);
  }

  const MILE_COIN_WARM = "assets/screen/award-coin-glyph-warm.svg";
  const MILE_COIN_MUT = "assets/screen/award-coin-glyph-muted.svg";

  const panelAv = document.getElementById("task-panel-available");
  const panelDone = document.getElementById("task-panel-done");
  if (!panelAv || !panelDone) return;

  const emptyLine = document.querySelector(".js-task-done-empty");

  function defState() {
    var o = {
      spotlight: { s: "active" },
      bonus: { c: 0, s: "active" },
    };
    var i;
    for (i = 0; i < MULTI_TASK_KEYS.length; i++) {
      o[MULTI_TASK_KEYS[i]] = { claimed: 0, s: "active" };
    }
    for (i = 0; i < EXTRA_TASK_KEYS.length; i++) {
      o[EXTRA_TASK_KEYS[i]] = { c: 0, s: "active" };
    }
    return o;
  }

  var S = defState();

  function updateDoneEmpty() {
    if (!emptyLine) return;
    emptyLine.hidden = panelDone.querySelectorAll(".js-task-claimed").length > 0;
  }

  function applyArticleState(art, key, state) {
    var a = "award-card award-card--task-cursor\n";
      if (state === "ready") {
      /* С кнопкой «Получить» серый фон; зелёная компактная карточка только во «Выполненных» */
      if (
        isMultiTask(key) ||
        key === "spotlight" ||
        key === "bonus" ||
        isExtraTask(key)
      ) {
        a += "award-card--active";
        if (key === "spotlight") a += " award-card--spotlight";
        a += " award-card--weekly-claim-step award-card--task-cursor--ready";
      } else {
        a += "award-card--done award-card--task-cursor--ready";
      }
    } else {
      a += "award-card--active";
      if (key === "spotlight") a += " award-card--spotlight";
      a += " award-card--task-cursor--active";
    }
    var keep = [];
    if (art.classList.contains("is-claim-footer-hiding")) keep.push("is-claim-footer-hiding");
    if (art.classList.contains("js-task-leave")) keep.push("js-task-leave");
    if (art.classList.contains("js-claimed-anim")) keep.push("js-claimed-anim");
    art.className = a;
    var i;
    for (i = 0; i < keep.length; i++) {
      art.classList.add(keep[i]);
    }
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  /** Центрирует сегмент в горизонтальном .award-card__progress без scrollIntoView — на мобильных Safari он двигает весь скролл страницы. */
  function scrollAwardProgressSegmentIntoView(pro, segEl) {
    if (!pro || !segEl) return;
    var pr = pro.getBoundingClientRect();
    var sr = segEl.getBoundingClientRect();
    pro.scrollLeft += sr.left - pr.left + sr.width / 2 - pr.width / 2;
  }

  function claimFooterSelector(key) {
    if (isMultiTask(key)) return ".js-mile-claim-footer";
    if (key === "spotlight") return ".js-spot-claim-footer";
    if (key === "bonus") return ".js-bonus-claim-footer";
    if (isExtraTask(key)) return ".js-generic-claim-footer";
    return null;
  }

  function setClaimFooterUi(art, key) {
    var t = S[key].s;
    var sel = claimFooterSelector(key);
    if (!sel) return;
    var foot = art.querySelector(sel);
    if (t === "ready") {
      if (foot) foot.removeAttribute("hidden");
      if (!art.getAttribute("data-cta-animated")) {
        art.setAttribute("data-cta-animated", "1");
        if (!prefersReducedMotion() && foot) {
          void foot.offsetWidth;
          foot.classList.add("js-cta-appear-anim");
          var onCtaEnd = function (ev) {
            if (ev.target !== foot) return;
            foot.classList.remove("js-cta-appear-anim");
            foot.removeEventListener("animationend", onCtaEnd);
          };
          foot.addEventListener("animationend", onCtaEnd, { once: true });
        }
      }
      art.setAttribute("data-state", "ready");
      applyArticleState(art, key, t);
      return;
    }

    if (foot) {
      foot.classList.remove("js-cta-appear-anim");
      if (foot.hasAttribute("hidden")) {
        art.classList.remove("is-claim-footer-hiding");
      } else if (prefersReducedMotion()) {
        foot.setAttribute("hidden", "");
        art.classList.remove("is-claim-footer-hiding");
      } else {
        var hideDone = false;
        function finishClaimFootHide() {
          if (hideDone) return;
          hideDone = true;
          foot.classList.remove("js-cta-hide-anim");
          foot.setAttribute("hidden", "");
          art.classList.remove("is-claim-footer-hiding");
          art.removeAttribute("data-cta-animated");
          art.setAttribute("data-state", "active");
          applyArticleState(art, key, t);
        }
        art.classList.add("is-claim-footer-hiding");
        void foot.offsetWidth;
        foot.classList.add("js-cta-hide-anim");
        foot.addEventListener(
          "animationend",
          function onClaimHide(ev) {
            if (ev.target !== foot) return;
            finishClaimFootHide();
          },
          { once: true }
        );
        setTimeout(finishClaimFootHide, 520);
        return;
      }
    }
    art.removeAttribute("data-cta-animated");
    art.setAttribute("data-state", "active");
    applyArticleState(art, key, t);
  }

  function renderSpotlight(art) {
    var t = S.spotlight;
    var done = countWeeklyDepsDone();
    var total = SPOTLIGHT_DEP_KEYS.length;
    var i;
    for (i = 0; i < 3; i++) {
      var d = art.querySelector('.js-dbar-early[data-idx="' + i + '"]');
      if (d) d.classList.toggle("is-filled", done > i);
    }
    var w = done >= total ? 100 : 0;
    var f = art.querySelector(".js-spotbar-last");
    if (f) f.style.width = w + "%";
    if (t.s === "ready") {
      var r100 = "100";
      art.setAttribute("data-reward", r100);
      var btnS = art.querySelector(".js-spot-claim-footer .js-task-claim");
      if (btnS) {
        btnS.textContent = "Получить 100 баллов";
        btnS.setAttribute("data-reward", r100);
      }
    } else {
      art.removeAttribute("data-reward");
    }
    setClaimFooterUi(art, "spotlight");
  }

  function renderMulti(art, key, skipProgressScroll) {
    var steps = MULTI_STEPS[key];
    var t = S[key];
    if (!steps || !t) return;
    var nSeg = steps.length;
    var i;
    for (i = 0; i < nSeg; i++) {
      var bar = art.querySelector('.js-mile-bar[data-idx="' + i + '"]');
      var filled = i < t.claimed || (i === t.claimed && t.s === "ready");
      if (bar) bar.classList.toggle("is-filled", filled);
    }
    var pro = art.querySelector(".award-card__progress");
    if (pro) {
      var segs = pro.querySelectorAll(".award-card__seg");
      var hi = t.claimed;
      for (i = 0; i < nSeg; i++) {
        var g = segs[i];
        if (!g) continue;
        var tag = g.querySelector(".award-card__tag");
        var ico = g.querySelector(".award-card__tag-ico");
        var tagVal = g.querySelector(".award-card__tag-val");
        if (tagVal) tagVal.textContent = String(steps[i]);
        if (tag) {
          if (i === hi) {
            tag.classList.add("award-card__tag--on");
            if (ico) ico.setAttribute("src", MILE_COIN_WARM);
          } else {
            tag.classList.remove("award-card__tag--on");
            if (ico) ico.setAttribute("src", MILE_COIN_MUT);
          }
        }
      }
      pro.classList.toggle("award-card__progress--scroll", nSeg > 3);
      /* Не крутим прогресс при первом paint — на мобильных сдвиг scrollLeft/раскладка двигают .game__inner вниз */
      if (nSeg > 3 && !skipProgressScroll) {
        var segScroll = segs[hi];
        if (segScroll) {
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
              scrollAwardProgressSegmentIntoView(pro, segScroll);
            });
          });
        }
      }
    }
    if (t.s === "ready" && t.claimed < nSeg) {
      var pts = steps[t.claimed];
      if (typeof pts === "number") {
        var rs = String(pts);
        art.setAttribute("data-reward", rs);
        var btnM = art.querySelector(".js-mile-claim-footer .js-task-claim");
        if (btnM) {
          btnM.textContent = "Получить " + pts + " баллов";
          btnM.setAttribute("data-reward", rs);
        }
      }
    } else {
      art.removeAttribute("data-reward");
    }
    setClaimFooterUi(art, key);
  }

  function renderBonus(art) {
    var t = S.bonus;
    var bar = art.querySelector(".js-bonus-bar-fill");
    if (bar) bar.style.width = t.c >= 1 ? "100%" : "0%";
    if (t.s === "ready") {
      var r40 = "40";
      art.setAttribute("data-reward", r40);
      var btnB = art.querySelector(".js-bonus-claim-footer .js-task-claim");
      if (btnB) {
        btnB.textContent = "Получить 40 баллов";
        btnB.setAttribute("data-reward", r40);
      }
    } else {
      art.removeAttribute("data-reward");
    }
    setClaimFooterUi(art, "bonus");
  }

  function renderExtra(art, key) {
    var t = S[key];
    if (!t) return;
    var pts = extraReward(key);
    var bar = art.querySelector(".js-simple-task-bar-fill");
    if (bar) bar.style.width = t.c >= 1 ? "100%" : "0%";
    var tagV = art.querySelector(".js-extra-tag-val");
    if (tagV) tagV.textContent = String(pts);
    if (t.s === "ready") {
      var rs = String(pts);
      art.setAttribute("data-reward", rs);
      var btn = art.querySelector(".js-generic-claim-footer .js-task-claim");
      if (btn) {
        btn.textContent = "Получить " + pts + " баллов";
        btn.setAttribute("data-reward", rs);
      }
    } else {
      art.removeAttribute("data-reward");
    }
    setClaimFooterUi(art, key);
  }

  function onAdvanceMulti(art, key) {
    var t = S[key];
    var steps = MULTI_STEPS[key];
    if (!t || !steps || t.s !== "active") return;
    if (t.claimed >= steps.length) return;
    t.s = "ready";
    renderMulti(art, key);
  }

  function onAdvanceBonus(art) {
    var t = S.bonus;
    if (t.s !== "active") return;
    t.c = 1;
    t.s = "ready";
    renderBonus(art);
  }

  function onAdvanceExtra(art, key) {
    var t = S[key];
    if (!t || t.s !== "active") return;
    t.c = 1;
    t.s = "ready";
    renderExtra(art, key);
  }

  function toClaimed(art, amount, skipClaimAnim) {
    if (!art) return;
    var titleDone = art.getAttribute("data-task-title") || TIT;
    const inner =
      '<div class="award-card__top"><div class="award-card__row"><div class="award-card__icon-wrap" aria-hidden="true"><div class="award-card__icon-bg"><div class="award-card__icon-inner"><img class="award-card__icon-img" src="assets/coffee.png" width="32" height="32" alt=""/></div></div></div><div class="award-card__copy award-card__copy--bundle"><div class="award-card__status-line" role="group" aria-label="Статус"><div class="award-card__meta"><span class="award-card__check-wrap"><img class="award-card__check" src="assets/verified.svg" width="11" height="11" alt=""/></span><span class="award-card__status award-card__status--ok">Выполнено</span></div><span class="award-card__sep" aria-hidden="true">·</span><div class="award-card__points"><span class="award-card__points-txt">Получено ' +
      String(amount) +
      '</span><img class="award-card__points-ico" src="assets/screen/award-coin-glyph-success.svg" width="11" height="11" alt="" decoding="async"/></div></div><p class="award-card__title">' +
      titleDone +
      '</p></div><button type="button" class="award-card__link" aria-label="Подробнее"><img class="award-card__chev" src="assets/chevron.svg" width="9" height="16" alt=""/></button></div></div>';
    art.removeAttribute("data-claiming");
    art.className = "award-card award-card--close js-task-claimed" + (skipClaimAnim ? "" : " js-claimed-anim");
    art.removeAttribute("data-state");
    art.setAttribute("aria-label", "Награда получена");
    art.removeAttribute("data-task");
    art.removeAttribute("data-reward");
    art.innerHTML = inner;
    panelDone.appendChild(art);
    if (!skipClaimAnim) {
      var enterStripped = false;
      function stripAnim() {
        if (enterStripped) return;
        enterStripped = true;
        art.classList.remove("js-claimed-anim");
        art.removeEventListener("animationend", onClaimEnterEnd);
      }
      function onClaimEnterEnd(ev) {
        if (ev.target === art) stripAnim();
      }
      art.addEventListener("animationend", onClaimEnterEnd, { once: true });
      setTimeout(stripAnim, 900);
    }
    updateDoneEmpty();
  }

  function claim(art, key) {
    if (!art || S[key].s !== "ready") return;
    if (art.getAttribute("data-claiming") === "1") return;
    if (typeof window.gameHapticClaim === "function") {
      window.gameHapticClaim();
    }
    var n;

    if (isMultiTask(key)) {
      var m = S[key];
      var steps = MULTI_STEPS[key];
      n = steps[m.claimed];
      if (typeof n !== "number") return;
      if (typeof window.gameAddPoints === "function") {
        window.gameAddPoints(n);
      }
      m.claimed += 1;
      if (m.claimed < steps.length) {
        m.s = "active";
        renderMulti(art, key);
        refreshSpotlight();
        return;
      }
      m.s = "claimed";
    } else {
      n = parseInt(art.getAttribute("data-reward") || "0", 10);
      if (typeof window.gameAddPoints === "function") {
        window.gameAddPoints(n);
      }
      S[key].s = "claimed";
    }
    if (key !== "spotlight") refreshSpotlight();
    if (prefersReducedMotion()) {
      toClaimed(art, n, true);
      return;
    }
    art.setAttribute("data-claiming", "1");
    var finished = false;
    function onLeaveEnd(ev) {
      if (ev.target !== art) return;
      if (ev.propertyName !== "max-height") return;
      go();
    }
    function go() {
      if (finished) return;
      finished = true;
      art.removeEventListener("transitionend", onLeaveEnd);
      art.style.removeProperty("max-height");
      art.style.removeProperty("overflow");
      art.classList.remove("js-task-leave", "js-task-leave--squeeze-gap");
      toClaimed(art, n, false);
    }
    var h = Math.ceil(art.getBoundingClientRect().height);
    art.style.overflow = "hidden";
    art.style.maxHeight = h + "px";
    if (art.previousElementSibling && art.nextElementSibling) {
      art.classList.add("js-task-leave--squeeze-gap");
    }
    void art.offsetWidth;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        art.classList.add("js-task-leave");
        art.style.maxHeight = "0px";
      });
    });
    art.addEventListener("transitionend", onLeaveEnd);
    setTimeout(go, 780);
  }

  function bind() {
    panelAv.addEventListener("click", function (e) {
      if (e.target.closest(".award-card__link")) return;
      if (e.target.closest(".js-task-claim")) return;
      var p = e.target.closest("article[data-task]");
      if (!p) return;
      if (e.target.closest(".task-fragment--ready")) return;
      var k = p.getAttribute("data-task");
      if (!S[k] || S[k].s !== "active") return;
      if (k === "spotlight") return;
      else if (isMultiTask(k)) onAdvanceMulti(p, k);
      else if (k === "bonus") onAdvanceBonus(p);
      else if (isExtraTask(k)) onAdvanceExtra(p, k);
    });

    panelAv.addEventListener("click", function (e) {
      var btn = e.target.closest(".js-task-claim");
      if (!btn) return;
      e.preventDefault();
      var p = e.target.closest("article[data-task]");
      if (!p) return;
      var k = p.getAttribute("data-task");
      claim(p, k);
    });
  }

  function firstPaint() {
    S = defState();
    var a = document.querySelector('article[data-task="spotlight"]');
    var c = document.querySelector('article[data-task="bonus"]');
    var mi;
    for (mi = 0; mi < MULTI_TASK_KEYS.length; mi++) {
      var mk = MULTI_TASK_KEYS[mi];
      var mel = document.querySelector('article[data-task="' + mk + '"]');
      if (mel) renderMulti(mel, mk, true);
    }
    if (c) renderBonus(c);
    var i;
    for (i = 0; i < EXTRA_TASK_KEYS.length; i++) {
      var k = EXTRA_TASK_KEYS[i];
      var el = document.querySelector('article[data-task="' + k + '"]');
      if (el) renderExtra(el, k);
    }
    if (a) refreshSpotlight();
    updateDoneEmpty();
  }

  bind();
  firstPaint();
})();
