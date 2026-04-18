(function () {
  "use strict";

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

  function vibrate(pattern) {
    if (prefersReducedMotion()) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      void e;
    }
  }

  /** Двойной короткий импульс при успешном «Получить» */
  function claim() {
    if (!isMobileHapticContext()) return;
    vibrate([12, 48, 14]);
  }

  /** Лёгкий импульс при загрузке (часто срабатывает на Android; iOS Safari может игнорировать без жеста) */
  function onOpen() {
    if (!isMobileHapticContext()) return;
    vibrate(16);
  }

  if (typeof window === "undefined") return;

  window.gameHapticClaim = claim;
  window.gameHapticOpen = onOpen;

  window.addEventListener(
    "load",
    function () {
      window.setTimeout(onOpen, 380);
    },
    { once: true }
  );
})();
