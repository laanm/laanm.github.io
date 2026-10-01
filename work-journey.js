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
