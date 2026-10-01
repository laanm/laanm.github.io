(() => {
  const canvas = document.getElementById('particle-scene');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const particles = [];
  const count = 1150;
  let width = 0;
  let height = 0;
  let scale = 1;
  let frame = 0;
  let visible = true;
  let pointerX = 0;
  let pointerY = 0;

  // A seeded layout keeps the opening scene stable between visits.
  let seed = 11352;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let index = 0; index < count; index += 1) {
    const arm = index % 4;
    const radius = 0.17 + Math.pow(random(), .69) * .83;
    const angle = radius * 11.7 + arm * Math.PI / 2 + (random() - .5) * 1.05;
    particles.push({
      x: Math.cos(angle) * radius + (random() - .5) * .11,
      y: (random() - .5) * (1.25 - radius * .45),
      z: Math.sin(angle) * radius + (random() - .5) * .12,
      size: .55 + random() * 1.7,
      color: random(),
      phase: random() * Math.PI * 2,
    });
  }

  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    scale = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    render(performance.now());
  }

  function render(time) {
    context.clearRect(0, 0, width, height);
    const mobile = width < 700;
    const centerX = width * (mobile ? .53 : .75);
    const centerY = height * (mobile ? .74 : .48);
    const radius = Math.min(width * (mobile ? .47 : .37), height * (mobile ? .36 : .53), 425);
    const rotation = (reduced.matches ? .7 : time * .00012) + pointerX * .18;
    const tilt = -.24 + pointerY * .12;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const tiltCos = Math.cos(tilt);
    const tiltSin = Math.sin(tilt);
    const view = [];

    for (const particle of particles) {
      const x = particle.x * cos - particle.z * sin;
      const z = particle.x * sin + particle.z * cos;
      const y = particle.y * tiltCos - z * tiltSin;
      const depth = particle.y * tiltSin + z * tiltCos;
      const perspective = 1.65 / (1.65 - depth * .38);
      view.push({
        x: centerX + x * radius * perspective,
        y: centerY + y * radius * perspective,
        depth,
        size: particle.size * perspective,
        color: particle.color,
        phase: particle.phase,
      });
    }

    view.sort((a, b) => a.depth - b.depth);
    for (const point of view) {
      const bright = .33 + (point.depth + 1) * .3;
      const shimmer = reduced.matches ? 1 : .86 + Math.sin(time * .0015 + point.phase) * .14;
      const alpha = Math.max(.11, Math.min(.9, bright * shimmer));
      context.beginPath();
      context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
      if (point.color < .5) context.fillStyle = `rgba(202,248,186,${alpha})`;
      else if (point.color < .82) context.fillStyle = `rgba(145,223,216,${alpha})`;
      else context.fillStyle = `rgba(241,252,243,${alpha})`;
      context.fill();
    }
  }

  function tick(time) {
    frame = 0;
    if (!visible || reduced.matches) return;
    render(time);
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    render(performance.now());
    if (visible && !reduced.matches) frame = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncMotion();
  });
  observer.observe(hero);
  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width - .5;
    pointerY = (event.clientY - bounds.top) / bounds.height - .5;
  }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', syncMotion);
  resize();
  syncMotion();
})();
