(() => {
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('particle-scene');
  if (!hero || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let active = true;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let seed = 77123;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const stars = Array.from({ length: 270 }, () => ({
    x: random(),
    y: random(),
    depth: .25 + random() * .75,
    radius: .35 + Math.pow(random(), 2) * 1.65,
    phase: random() * Math.PI * 2,
    hue: random(),
  }));

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const seconds = reducedMotion.matches ? 0 : time * .001;
    for (const star of stars) {
      const movement = seconds * star.depth * .0007;
      const x = ((star.x + movement + 1) % 1) * width + pointerX * star.depth * 17;
      const y = star.y * height + pointerY * star.depth * 13;
      const shimmer = reducedMotion.matches ? 1 : .72 + .28 * Math.sin(seconds * (.75 + star.depth) + star.phase);
      const alpha = (.2 + star.depth * .52) * shimmer;
      const radius = star.radius * (.65 + star.depth * .65);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = star.hue > .8 ? `rgba(164,225,255,${alpha})` : `rgba(244,251,255,${alpha})`;
      ctx.fill();
      if (star.radius > 1.4 && star.depth > .75) {
        ctx.beginPath();
        ctx.moveTo(x - radius * 3, y);
        ctx.lineTo(x + radius * 3, y);
        ctx.strokeStyle = `rgba(220,245,255,${alpha * .16})`;
        ctx.lineWidth = .5;
        ctx.stroke();
      }
    }

    if (!reducedMotion.matches) {
      const cycle = seconds % 12;
      if (cycle > 7.7 && cycle < 9.1) {
        const progress = (cycle - 7.7) / 1.4;
        const x = width * (1.06 - progress * .5);
        const y = height * (.08 + progress * .24);
        const tail = ctx.createLinearGradient(x, y, x + 115, y - 55);
        tail.addColorStop(0, `rgba(200,239,255,${Math.sin(progress * Math.PI) * .65})`);
        tail.addColorStop(1, 'rgba(200,239,255,0)');
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 115, y - 55);
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  }

  function tick(time) {
    frame = 0;
    if (!active || reducedMotion.matches) return;
    draw(time);
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    draw(performance.now());
    if (active && !reducedMotion.matches) frame = requestAnimationFrame(tick);
  }

  function resize() {
    const box = hero.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    pixelRatio = Math.min(devicePixelRatio || 1, 1.7);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(performance.now());
  }

  new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    sync();
  }).observe(hero);
  hero.addEventListener('pointermove', event => {
    const box = hero.getBoundingClientRect();
    pointerX = (event.clientX - box.left) / box.width - .5;
    pointerY = (event.clientY - box.top) / box.height - .5;
  }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  reducedMotion.addEventListener('change', sync);
  resize();
  sync();
})();
