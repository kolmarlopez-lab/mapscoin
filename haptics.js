(function () {
  "use strict";

  var audioCtx = null;
  var claimMoneyAudio = null;

  var CLAIM_SOUND_SRC = "assets/sound/money.mp3";

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

  function getClaimMoneyAudio() {
    if (claimMoneyAudio) return claimMoneyAudio;
    try {
      claimMoneyAudio = new Audio(CLAIM_SOUND_SRC);
      claimMoneyAudio.preload = "auto";
    } catch (e) {
      void e;
      return null;
    }
    return claimMoneyAudio;
  }

  /** Звук при нажатии на кнопки «Получить» / начисления баллов */
  function playClaimMoneySound() {
    if (prefersReducedMotion()) return;
    var a = getClaimMoneyAudio();
    if (!a) return;
    try {
      a.currentTime = 0;
      var p = a.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    } catch (e) {
      void e;
    }
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

  /** Дополнительная вибрация при успешном «Получить» (звук уже на pointerdown) */
  function claim() {
    if (!isMobileHapticContext()) return;
    if (prefersReducedMotion()) return;
    tryVibrate([12, 48, 14]);
  }

  /** Лёгкий импульс при загрузке (часто срабатывает на Android; iOS Safari может игнорировать без жеста) */
  function onOpen() {
    if (!isMobileHapticContext()) return;
    vibrate(16);
  }

  /** Отклик при нажатии на обычные кнопки (не начисление баллов) */
  function tap() {
    if (!isMobileHapticContext()) return;
    if (prefersReducedMotion()) return;
    if (tryVibrate(10)) return;
    playSoftClick();
  }

  /** Нажатие на кнопку получения баллов: звук из assets/sound + вибрация на поддерживаемых устройствах */
  function tapClaimReward() {
    if (prefersReducedMotion()) return;
    playClaimMoneySound();
    if (isMobileHapticContext()) tryVibrate(10);
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
      if (el.classList.contains("js-award-claim")) {
        tapClaimReward();
        return;
      }
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
