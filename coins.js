(function () {
  "use strict";

  /** Локальные PNG в assets/CoinsPic (имена из Figma — кодируем для URL) */
  const COIN_SRC = [
    "Property 1=Default.png",
    "Property 1=Variant2.png",
    "Property 1=Variant3.png",
    "Property 1=Variant4.png",
  ].map(function (name) {
    return "assets/CoinsPic/" + encodeURIComponent(name);
  });

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function isMobileViewport() {
    try {
      return window.matchMedia("(max-width: 600px)").matches;
    } catch (e) {
      return false;
    }
  }

  const CONFIG = {
    spreadX: 3.2,
    burstUpMin: 2.2,
    burstUpMax: 5,
    gravity: 0.045,
    lifeMs: 4200,
    lifeMsMobile: 2800,
    startSpread: 14,
    stagger: 11,
    /** Не спавнить по одному спрайту на балл — это убивает мобильные GPU */
    maxParticles: 14,
    particlesReduced: 3,
  };

  const active = [];
  var rafId = null;

  function pick(min, max) {
    return min + Math.random() * (max - min);
  }

  /** Визуальная «плотность» от награды, но с жёстким потолком */
  function particleCountForReward(reward) {
    var n = Math.floor(reward);
    if (n <= 0) return 0;
    if (prefersReducedMotion()) {
      return Math.min(CONFIG.particlesReduced, n > 0 ? CONFIG.particlesReduced : 0);
    }
    var visual = Math.max(4, Math.round(n / 7));
    return Math.min(CONFIG.maxParticles, visual);
  }

  function scheduleTick() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(tick);
  }

  function tick(now) {
    rafId = null;
    var keepGoing = false;
    var i;
    for (i = active.length - 1; i >= 0; i--) {
      var c = active[i];
      var elapsed = now - c.start - c.delay;
      if (elapsed < 0) {
        keepGoing = true;
        continue;
      }

      c.vy += CONFIG.gravity;
      c.x += c.vx;
      c.y += c.vy;

      var fade = Math.max(0, 1 - elapsed / c.lifeMs);
      var s = 0.72 + 0.28 * fade;

      c.entity.style.opacity = String(fade * fade);
      c.mesh.style.transform = "scale(" + s + ")";
      c.entity.style.transform =
        "translate3d(" + c.x + "px," + c.y + "px,0) translate(-50%,-50%)";

      if (elapsed < c.lifeMs && c.y < window.innerHeight + 120) {
        keepGoing = true;
      } else {
        c.entity.remove();
        active.splice(i, 1);
      }
    }
    if (keepGoing || active.length > 0) {
      scheduleTick();
    }
  }

  function spawnCoins(originX, originY, count) {
    var n = Math.floor(count);
    if (n <= 0) return;

    var lifeMs = isMobileViewport() ? CONFIG.lifeMsMobile : CONFIG.lifeMs;
    var stagger = Math.max(2, Math.min(CONFIG.stagger, Math.floor(1600 / n)));

    var i;
    for (i = 0; i < n; i++) {
      var entity = document.createElement("div");
      entity.className = "coin-entity";
      var mesh = document.createElement("div");
      mesh.className = "coin-mesh";
      var img = document.createElement("img");
      img.className = "coin-sprite";
      img.src = COIN_SRC[i % 4];
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.loading = "eager";
      mesh.appendChild(img);
      entity.appendChild(mesh);

      var size = pick(26, 44);
      entity.style.width = size + "px";
      entity.style.height = size + "px";
      entity.style.left = "0";
      entity.style.top = "0";
      entity.style.opacity = "1";

      var x = originX + pick(-CONFIG.startSpread, CONFIG.startSpread);
      var y = originY + pick(-CONFIG.startSpread, CONFIG.startSpread);
      var vx = pick(-CONFIG.spreadX, CONFIG.spreadX);
      var vy = -pick(CONFIG.burstUpMin, CONFIG.burstUpMax);
      var delay = i * stagger;

      entity.style.transform = "translate3d(" + x + "px," + y + "px,0) translate(-50%,-50%)";
      mesh.style.transform = "scale(1)";

      document.body.appendChild(entity);

      active.push({
        entity: entity,
        mesh: mesh,
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        start: performance.now(),
        delay: delay,
        lifeMs: lifeMs,
      });
    }
    scheduleTick();
  }

  /** Количество монет из `data-reward` на кнопке — ограничиваем частицы */
  function rewardPointsFromButton(btn) {
    const raw = btn.getAttribute("data-reward");
    if (raw == null || raw === "") return 0;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    return n;
  }

  const triggers = document.querySelectorAll(".js-award-claim");
  if (!triggers.length) return;

  function bindClick(btn) {
    btn.addEventListener("click", function () {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      spawnCoins(cx, cy, particleCountForReward(rewardPointsFromButton(btn)));
    });
  }

  triggers.forEach(bindClick);
})();
