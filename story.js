/* ============ Ember — Story Page effects ============ */
(() => {
  "use strict";

  /* ---- scroll reveal ---- */
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ---- floating ember particles ---- */
  const canvas = document.getElementById("ember-canvas");
  const ctx = canvas.getContext("2d");
  let w, h, particles;
  const COLORS = ["255,157,77", "255,93,61", "255,201,77", "111,184,255"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function makeParticles() {
    const count = Math.min(70, Math.round((w * h) / 22000));
    particles = Array.from({ length: count }, () => spawn(Math.random() * h));
  }

  function spawn(y) {
    return {
      x: Math.random() * w,
      y: y ?? h + 20,
      r: 0.6 + Math.random() * 2.2,
      speed: 0.25 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.15 + Math.random() * 0.45,
      flicker: Math.random() * Math.PI * 2,
    };
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y -= p.speed;
      p.x += p.drift;
      p.flicker += 0.05;
      const a = p.alpha * (0.7 + 0.3 * Math.sin(p.flicker));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${p.color},${a})`;
      ctx.fill();
      if (p.y < -20) Object.assign(p, spawn());
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => {
    resize();
    makeParticles();
  });

  resize();
  makeParticles();
  if (!reduceMotion) requestAnimationFrame(tick);
})();
