(function () {
  "use strict";

  const BALANCE_KEY = "headerBalance";
  const WEEK_EARNED_KEY = "headerWeekEarned";
  const DAILY_AWARD = 10;
  /** Число ячеек «Баллы за вход» в разметке (10 баллов за каждую; 7 дней включая сегодня). */
  const DAILY_STREAK_SLOTS = 7;
  const DEFAULT_BALANCE = 1800;
  const LEGACY_DAILY_KEY = "dailyRewardNextAt";

  function getWeeklyTasksMaxFromPage() {
    if (typeof window !== "undefined" && typeof window.gameWeeklyTasksMaxPoints === "number") {
      return window.gameWeeklyTasksMaxPoints;
    }
    return 305;
  }

  function getWeekMaxPoints() {
    return DAILY_AWARD * DAILY_STREAK_SLOTS + getWeeklyTasksMaxFromPage();
  }

  const btn = document.getElementById("getDailyBtn");
  const cell = document.getElementById("dailyCellToday");
  const glyph = document.getElementById("dailyCellTodayGlyph");
  const mark = document.getElementById("dailyCellTodayMark");
  const streakHint = document.getElementById("dailyStreakHint");
  const balanceVal = document.getElementById("headerBalanceValue");
  const weekVal = document.getElementById("headerWeekProgress");
  const balancePill = document.querySelector(".game-balance__pill");
  const balanceWrap = document.querySelector(".game-balance");

  try {
    localStorage.removeItem(LEGACY_DAILY_KEY);
    /* При каждой перезагрузке сбрасываем накопленное: баланс и неделя берутся из разметки */
    localStorage.removeItem(BALANCE_KEY);
    localStorage.removeItem(WEEK_EARNED_KEY);
  } catch (e) {
    void e;
  }

  function nextLocalMidnight() {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatHms(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const s = totalSeconds % 60;
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor(totalSeconds / 3600);
    return pad2(h) + ":" + pad2(m) + ":" + pad2(s);
  }

  function getSavedBalance() {
    const raw = localStorage.getItem(BALANCE_KEY);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }

  function setSavedBalance(n) {
    localStorage.setItem(BALANCE_KEY, String(n));
  }

  function getSavedWeekEarned() {
    const raw = localStorage.getItem(WEEK_EARNED_KEY);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }

  function setSavedWeekEarned(n) {
    localStorage.setItem(WEEK_EARNED_KEY, String(n));
  }

  function parseWeekParts() {
    const fallbackMax = getWeekMaxPoints();
    if (!weekVal) {
      return { earned: 0, max: fallbackMax };
    }
    const m = String(weekVal.textContent).match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!m) {
      return { earned: 0, max: fallbackMax };
    }
    const earned = parseInt(m[1], 10);
    const max = parseInt(m[2], 10);
    return {
      earned: Number.isNaN(earned) ? 0 : earned,
      max: Number.isNaN(max) ? fallbackMax : max,
    };
  }

  function parseBalanceText() {
    if (!balanceVal) return DEFAULT_BALANCE;
    const n = parseInt(String(balanceVal.textContent).replace(/[^\d]/g, ""), 10);
    return Number.isNaN(n) ? DEFAULT_BALANCE : n;
  }

  function initBalance() {
    if (!balanceVal) return;
    const stored = getSavedBalance();
    if (stored != null) {
      balanceVal.textContent = String(stored);
    }
  }

  function initWeekProgress() {
    if (!weekVal) return;
    const max = getWeekMaxPoints();
    const w = getSavedWeekEarned();
    const earned = w == null ? 0 : Math.min(Math.max(0, w), max);
    weekVal.textContent = String(earned) + "/" + String(max);
  }

  var dailyLayoutResizeTimer = null;

  /** «Сегодня» по центру видимой области: при overflow — scroll; если ряд целиком влезает — центрируем flex. */
  function updateDailyStripLayout() {
    var strip = document.querySelector(".daily");
    var today = document.getElementById("dailyCellToday");
    if (!strip || !today) return;
    var fits = strip.scrollWidth <= strip.clientWidth + 1;
    strip.classList.toggle("daily--fits", fits);
    if (fits) {
      strip.scrollLeft = 0;
      return;
    }
    var tr = today.getBoundingClientRect();
    var sr = strip.getBoundingClientRect();
    strip.scrollLeft += tr.left - sr.left + tr.width / 2 - sr.width / 2;
  }

  function scheduleDailyStripLayout() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(updateDailyStripLayout);
    });
  }

  /** Склонение «день / дня / дней» для натурального n. */
  function pluralDaysRu(n) {
    const k = Math.abs(Math.floor(n)) % 100;
    const k1 = k % 10;
    if (k >= 11 && k <= 14) return "дней";
    if (k1 === 1) return "день";
    if (k1 >= 2 && k1 <= 4) return "дня";
    return "дней";
  }

  /**
   * Подряд идущие дни, когда начислялись баллы за вход: сегодня (если получено) + подряд идущие
   * предыдущие дни с отметкой «выполнено».
   */
  function computeDailyClaimStreak() {
    var cells = document.querySelectorAll(".daily .daily__cell");
    var todayIdx = -1;
    var i;
    for (i = 0; i < cells.length; i++) {
      if (cells[i].id === "dailyCellToday") {
        todayIdx = i;
        break;
      }
    }
    if (todayIdx < 0) return 0;

    var streak = 0;
    var todayEl = cells[todayIdx];
    if (todayEl.getAttribute("data-claimed") === "true") {
      streak = 1;
    }
    for (i = todayIdx - 1; i >= 0; i--) {
      if (cells[i].classList.contains("daily__cell--icondone")) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }

  function updateDailyStreakHint() {
    if (!streakHint) return;
    var n = computeDailyClaimStreak();
    streakHint.textContent = String(n) + " " + pluralDaysRu(n) + " подряд";
  }

  function addPointsWithAnimation(amount) {
    const n = Math.floor(Math.abs(amount));
    if (!balanceVal || n <= 0) return;
    const fromB = parseBalanceText();
    const toB = fromB + n;
    const wParts = parseWeekParts();
    const weekMax = getWeekMaxPoints();
    const fromW = wParts.earned;
    const toW = Math.min(fromW + n, weekMax);
    if (balancePill) {
      balancePill.classList.add("game-balance__pill--bump");
      window.setTimeout(function () {
        balancePill.classList.remove("game-balance__pill--bump");
      }, 900);
    }
    if (balanceWrap) {
      const delta = document.createElement("span");
      delta.className = "game-balance__delta";
      delta.textContent = "+" + n;
      balanceWrap.appendChild(delta);
      window.setTimeout(function () {
        delta.remove();
      }, 1200);
    }
    const t0 = performance.now();
    const DUR = 600;
    function step(now) {
      const t = Math.min(1, (now - t0) / DUR);
      const eased = 1 - Math.pow(1 - t, 3);
      const b = Math.round(fromB + (toB - fromB) * eased);
      const wE = Math.round(fromW + (toW - fromW) * eased);
      balanceVal.textContent = String(b);
      if (weekVal) {
        weekVal.textContent = String(wE) + "/" + String(weekMax);
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        balanceVal.textContent = String(toB);
        setSavedBalance(toB);
        if (weekVal) {
          weekVal.textContent = String(toW) + "/" + String(weekMax);
          setSavedWeekEarned(toW);
        }
      }
    }
    requestAnimationFrame(step);
  }

  if (btn && cell && glyph && mark) {
    const GLYPH_TODAY = "assets/screen/daily-glyph-coin-today.svg";
    const GLYPH_DONE = "assets/screen/daily-glyph-coin.svg";
    const ICON_DONE = "assets/screen/daily-icon-done.svg";
    const FLAME = "assets/screen/daily-icon-flame.svg";
    let tickTimer = null;

    function applyCellClaimed() {
      cell.classList.add("daily__cell--claimed");
      cell.setAttribute("data-claimed", "true");
      glyph.src = GLYPH_DONE;
      mark.className = "daily__mark";
      mark.src = ICON_DONE;
      mark.width = 14;
      mark.height = 14;
      updateDailyStreakHint();
    }

    function resetCellForNewDay() {
      cell.classList.remove("daily__cell--claimed");
      cell.setAttribute("data-claimed", "false");
      glyph.src = GLYPH_TODAY;
      mark.className = "daily__mark daily__mark--flame";
      mark.src = FLAME;
      mark.width = 10;
      mark.height = 10;
      updateDailyStreakHint();
    }

    function startCountdownUI(targetTs) {
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }

      function update() {
        const rem = Math.floor((targetTs - Date.now()) / 1000);
        if (rem <= 0) {
          if (tickTimer) clearInterval(tickTimer);
          tickTimer = null;
          resetCellForNewDay();
          btn.classList.remove("daily-cta--countdown");
          btn.disabled = false;
          btn.textContent = "Получить 10 баллов";
          return;
        }
        btn.textContent = "Новая награда через " + formatHms(rem);
      }

      btn.classList.add("daily-cta--countdown");
      btn.disabled = true;
      update();
      tickTimer = setInterval(update, 1000);
    }

    function applyClaimedFromClick() {
      if (cell.getAttribute("data-claimed") === "true") return;
      const target = nextLocalMidnight();
      applyCellClaimed();
      addPointsWithAnimation(DAILY_AWARD);
      startCountdownUI(target.getTime());
    }

    btn.addEventListener("click", function () {
      if (cell.getAttribute("data-claimed") === "true") return;
      applyClaimedFromClick();
    });
  }

  initBalance();
  initWeekProgress();
  updateDailyStreakHint();
  scheduleDailyStripLayout();
  window.addEventListener(
    "resize",
    function () {
      if (dailyLayoutResizeTimer) window.clearTimeout(dailyLayoutResizeTimer);
      dailyLayoutResizeTimer = window.setTimeout(updateDailyStripLayout, 120);
    },
    { passive: true }
  );

  if (typeof window !== "undefined" && balanceVal) {
    window.gameAddPoints = addPointsWithAnimation;
  }
})();
