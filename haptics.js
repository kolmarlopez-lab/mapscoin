(function () {
  "use strict";

  var audioCtx = null;

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  /** Телефоны / планшеты с грубым указателем или тач на узком экране */
  function isMobileHapticContext() {
    try {
      if (window.matchMedia("(pointer: coarse)").matches) return true;
      if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
        return window.matchMedia("(max-width: 900px)").matches;
      }
    } catch (e) {
      void e;
    }
    return false;
  }

  function getAudioContext() {
    if (audioCtx) return audioCtx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch (e) {
      void e;
      return null;
    }
    return audioCtx;
  }

  /**
   * Короткий «щелчок» как замена вибрации (Safari не поддерживает navigator.vibrate).
   * Вызывать только из обработчика жеста пользователя — иначе iOS может не запустить звук.
   */
  function playSoftClick(when) {
    if (prefersReducedMotion()) return;
    var ctx = getAudioContext();
    if (!ctx) return;
    var t0 = typeof when === "number" ? when : ctx.currentTime;
    try {
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) {
      void e;
    }
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(185, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.024);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.028);
    } catch (e) {
      void e;
    }
  }

  function playClaimClicks() {
    var ctx = getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) {
      void e;
    }
    var t0 = ctx.currentTime;
    playSoftClick(t0);
    playSoftClick(t0 + 0.062);
  }

  function tryVibrate(pattern) {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return false;
    }
    try {
      return navigator.vibrate(pattern) !== false;
    } catch (e) {
      void e;
      return false;
    }
  }

  function vibrate(pattern) {
    if (prefersReducedMotion()) return;
    tryVibrate(pattern);
  }

  /** Двойной короткий импульс при успешном «Получить» */
  function claim() {
    if (!isMobileHapticContext()) return;
    if (prefersReducedMotion()) return;
    if (tryVibrate([12, 48, 14])) return;
    playClaimClicks();
  }

  /** Лёгкий импульс при загрузке (часто срабатывает на Android; iOS Safari может игнорировать без жеста) */
  function onOpen() {
    if (!isMobileHapticContext()) return;
    vibrate(16);
  }

  /** Короткий отклик при нажатии на кнопку (до срабатывания click) */
  function tap() {
    if (!isMobileHapticContext()) return;
    if (prefersReducedMotion()) return;
    if (tryVibrate(10)) return;
    playSoftClick();
  }

  if (typeof window === "undefined") return;

  window.gameHapticClaim = claim;
  window.gameHapticOpen = onOpen;
  window.gameHapticTap = tap;

  document.addEventListener(
    "pointerdown",
    function (e) {
      if (e.button !== 0) return;
      var el = e.target && e.target.closest && e.target.closest("button");
      if (!el || el.disabled) return;
      tap();
    },
    { passive: true, capture: true }
  );

  window.addEventListener(
    "load",
    function () {
      window.setTimeout(onOpen, 380);
    },
    { once: true }
  );
})();
