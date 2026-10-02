(() => {
  const stops = [...document.querySelectorAll('.project-stop')];
  if (!stops.length || !('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    }
  }, { rootMargin: '0px 0px 15% 0px', threshold: .08 });

  stops.forEach(stop => {
    if (stop.getBoundingClientRect().top < innerHeight * 1.25) stop.classList.add('is-visible');
    observer.observe(stop);
  });
  document.documentElement.classList.add('work-enhanced');
})();

(() => {
  const dock = document.querySelector('.constellation-dock');
  const header = document.querySelector('.site-header');
  if (!dock || !header) return;
  const toggle = document.createElement('button');
  toggle.className = 'chart-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open star navigation');
  toggle.setAttribute('aria-expanded', 'false');
  header.insertBefore(toggle, header.querySelector('.site-nav'));
  const close = document.createElement('button');
  close.className = 'chart-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close star navigation');
  close.textContent = 'CLOSE MAP ×';
  dock.appendChild(close);

  const protectedContent = [...document.querySelectorAll([
    '.hero-copy', '.summary-strip', '.section-work .section-heading', '.work-foundation',
    '.stop-story', '.stop-visual', '.professional-extensions',
    '.syl-section .section-heading', '.syl-intro', '.lab-link', '.architecture-grid > div',
    '.about-grid > div', '.skills-section .section-heading', '.toolkit-layout',
    '.contact-section > h2', '.contact-section > p', '.contact-section > a', '.site-footer'
  ].join(','))];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const intersection = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  let queued = false;
  let lastLocation = null;
  let revealTimer;
  const closeMap = () => {
    dock.classList.remove('is-expanded');
    document.documentElement.classList.remove('chart-expanded');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open star navigation');
  };
  toggle.addEventListener('click', () => {
    dock.classList.add('is-expanded');
    document.documentElement.classList.add('chart-expanded');
    toggle.setAttribute('aria-expanded', 'true');
    close.focus();
  });
  close.addEventListener('click', () => { closeMap(); toggle.focus(); });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && dock.classList.contains('is-expanded')) { closeMap(); toggle.focus(); }
  });
  dock.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMap));

  const placeChart = () => {
    queued = false;
    if (innerWidth <= 760) {
      document.documentElement.classList.add('chart-compact');
      dock.classList.add('is-compact');
      dock.classList.remove('is-relocating');
      toggle.textContent = '✦ Navigate';
      return;
    }
    const width = Math.min(560, innerWidth - 30);
    const height = 220;
    const preferredLeft = clamp(parseFloat(dock.style.getPropertyValue('--dock-left')) || innerWidth - width - 18, 18, innerWidth - width - 18);
    const preferredTop = clamp(parseFloat(dock.style.getPropertyValue('--dock-top')) || 90, 88, innerHeight - height - 16);
    const positions = [
      [preferredLeft, preferredTop], [18, innerHeight - height - 18],
      [innerWidth - width - 18, 88], [18, 88],
      [innerWidth - width - 18, innerHeight - height - 18]
    ];
    const obstacles = protectedContent.map(element => element.getBoundingClientRect()).filter(rect => rect.width && rect.height && rect.bottom > 75 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth);
    const safe = positions.map(([left, top]) => ({ left, top, score: obstacles.reduce((total, rect) => total + intersection({left:left-24,top:top-18,right:left+width+24,bottom:top+height+18}, rect), 0) })).filter(position => position.score < 600).sort((a, b) => Math.hypot(a.left - preferredLeft, a.top - preferredTop) - Math.hypot(b.left - preferredLeft, b.top - preferredTop))[0];
    const compact = !safe;
    dock.classList.toggle('is-compact', compact);
    document.documentElement.classList.toggle('chart-compact', compact);
    const current = dock.querySelector('.constellation-destination.is-current strong')?.textContent.trim() || (dock.querySelector('.constellation-origin.is-current') ? 'Start' : 'Explore');
    toggle.textContent = `✦ Navigate · ${current}`;
    if (compact) {
      lastLocation = null;
      clearTimeout(revealTimer);
      dock.classList.remove('is-relocating');
      document.documentElement.classList.remove('chart-relocating');
      return;
    }
    dock.style.setProperty('--safe-left', `${Math.round(safe.left)}px`);
    dock.style.setProperty('--safe-top', `${Math.round(safe.top)}px`);
    if (lastLocation && Math.hypot(safe.left - lastLocation.left, safe.top - lastLocation.top) > 130 && !dock.classList.contains('is-expanded')) {
      dock.classList.add('is-relocating');
      document.documentElement.classList.add('chart-relocating');
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => {
        dock.classList.remove('is-relocating');
        document.documentElement.classList.remove('chart-relocating');
      }, 1120);
    }
    lastLocation = safe;
  };
  const requestPlacement = () => {
    if (!queued) { queued = true; requestAnimationFrame(placeChart); }
  };
  addEventListener('scroll', () => { closeMap(); requestPlacement(); }, { passive: true });
  addEventListener('resize', requestPlacement);
  requestPlacement();
})();
