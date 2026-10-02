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
  const about = document.getElementById('about');
  const skills = document.getElementById('skills');
  if (!dock || !about || !skills) return;
  const placeChart = () => {
    const readingPoint = scrollY + innerHeight * .38;
    const aboutTop = about.getBoundingClientRect().top + scrollY;
    const skillsTop = skills.getBoundingClientRect().top + scrollY;
    dock.classList.toggle('is-experience', readingPoint >= aboutTop && readingPoint < skillsTop);
  };
  addEventListener('scroll', placeChart, { passive: true });
  addEventListener('resize', placeChart);
  placeChart();
})();
