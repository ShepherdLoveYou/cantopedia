/**
 * Hub.astro client-side logic, factored out so it can be re-invoked on
 * Astro ClientRouter lifecycle events (astro:after-swap + astro:page-load).
 * Each init function is idempotent — safe to call multiple times — and
 * tagged with a data attribute so subsequent calls short-circuit when the
 * DOM hasn't been swapped.
 */

type DishLite = { id: string; name: string; img: string | null };

export function initFeaturedTile(base: string, locale: string, dishesData: DishLite[]) {
  const tile = document.getElementById('featured-tile') as HTMLAnchorElement | null;
  if (!tile || tile.dataset.wired === '1') return;
  tile.dataset.wired = '1';

  const faces = tile.querySelectorAll<HTMLElement>('.featured-face');
  const withImg = dishesData.filter((d) => d.img);
  if (withImg.length === 0) return;

  const today = new Date();
  const dayOfYear = Math.floor((+today - +new Date(today.getFullYear(), 0, 0)) / 86400000);
  const todayDish = withImg[dayOfYear % withImg.length];
  const randomDish = withImg[Math.floor(Math.random() * withImg.length)];

  let recentDish: DishLite | null = null;
  try {
    const recentId = localStorage.getItem('cantopedia-last-dish');
    if (recentId) {
      recentDish = dishesData.find((d) => d.id === recentId && d.img) ?? null;
    }
  } catch {}
  if (!recentDish) recentDish = todayDish;

  const picks: Record<string, DishLite> = { today: todayDish, random: randomDish, recent: recentDish };

  faces.forEach((face) => {
    const f = face.dataset.face;
    if (!f) return;
    const pick = picks[f];
    if (!pick) return;
    const imgEl = face.querySelector<HTMLElement>('.featured-img');
    if (imgEl && pick.img) imgEl.style.backgroundImage = `url("${pick.img}")`;
    const nameEl = face.querySelector<HTMLElement>('.featured-name');
    if (nameEl) nameEl.textContent = pick.name;
  });

  tile.addEventListener('click', () => {
    const active = tile.querySelector<HTMLElement>('.featured-face--active');
    const f = active?.dataset.face;
    if (!f) return;
    const pick = picks[f];
    if (pick) {
      try { localStorage.setItem('cantopedia-last-dish', pick.id); } catch {}
      tile.href = `${base}/${locale}/dishes/${pick.id}`;
    }
  });
  tile.href = `${base}/${locale}/dishes/${todayDish.id}`;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  const intervalId = window.setInterval(() => {
    faces[i].classList.remove('featured-face--active');
    i = (i + 1) % faces.length;
    faces[i].classList.add('featured-face--active');
    const f = faces[i].dataset.face;
    if (f && picks[f]) tile.href = `${base}/${locale}/dishes/${picks[f].id}`;
  }, 6000);
  (tile as any)._featuredInterval = intervalId;
}

export function teardownFeaturedTile() {
  const tile = document.getElementById('featured-tile') as HTMLElement | null;
  if (!tile) return;
  const id = (tile as any)._featuredInterval;
  if (typeof id === 'number') clearInterval(id);
  delete tile.dataset.wired;
}

export function initHubNav() {
  const hub = document.getElementById('hub') as HTMLElement | null;
  if (!hub || hub.dataset.navWired === '1') return;
  hub.dataset.navWired = '1';

  const titleEl = document.getElementById('hub-pivot-title');
  const prevLink = document.getElementById('hub-pivot-prev') as HTMLAnchorElement | null;
  const nextLink = document.getElementById('hub-pivot-next') as HTMLAnchorElement | null;
  const peekPrev = document.getElementById('hub-pivot-peek-prev');
  const peekNext = document.getElementById('hub-pivot-peek-next');
  const panels = Array.from(hub.querySelectorAll<HTMLElement>('.hub-panel'));
  if (panels.length === 0) return;

  function offsetOf(i: number) {
    return panels[i].offsetLeft - panels[0].offsetLeft;
  }
  function getActiveIndex() {
    const sl = hub!.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const d = Math.abs(offsetOf(i) - sl);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function updatePivot(i: number) {
    const p = panels[i];
    if (!p) return;
    const name = p.dataset.name ?? '';
    const url = p.dataset.url ?? '';
    if (titleEl) titleEl.textContent = name;
    document.title = `${name} · 粵食典 Cantopedia`;
    if (url && location.pathname + location.hash !== url) {
      history.replaceState({ panelIndex: i }, '', url);
    }
    const prev = panels[(i - 1 + panels.length) % panels.length];
    const next = panels[(i + 1) % panels.length];
    if (prevLink && prev?.dataset.url) prevLink.href = prev.dataset.url;
    if (nextLink && next?.dataset.url) nextLink.href = next.dataset.url;
    if (peekPrev) peekPrev.textContent = prev?.dataset.name ?? '';
    if (peekNext) peekNext.textContent = next?.dataset.name ?? '';
  }

  function scrollToIndex(i: number) {
    hub!.scrollTo({ left: offsetOf(i), behavior: 'smooth' });
  }

  const initialPanelId = hub.dataset.initialPanel;
  const initialIdx = panels.findIndex((p) => p.dataset.panel === initialPanelId);
  if (initialIdx > 0) {
    hub.style.scrollBehavior = 'auto';
    hub.scrollLeft = offsetOf(initialIdx);
    requestAnimationFrame(() => { hub.style.scrollBehavior = 'smooth'; });
  }
  updatePivot(initialIdx >= 0 ? initialIdx : 0);

  prevLink?.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToIndex((getActiveIndex() - 1 + panels.length) % panels.length);
  });
  nextLink?.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToIndex((getActiveIndex() + 1) % panels.length);
  });

  hub.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevLink?.click(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nextLink?.click(); }
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0.5) {
        const idx = panels.indexOf(entry.target as HTMLElement);
        if (idx >= 0) updatePivot(idx);
      }
    });
  }, { root: hub, threshold: [0.5] });
  panels.forEach((p) => io.observe(p));

  let resizeT: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      const i = getActiveIndex();
      hub.style.scrollBehavior = 'auto';
      hub.scrollLeft = offsetOf(i);
      requestAnimationFrame(() => { hub.style.scrollBehavior = 'smooth'; });
    }, 100);
  });
}

export function teardownHubNav() {
  const hub = document.getElementById('hub') as HTMLElement | null;
  if (!hub) return;
  delete hub.dataset.navWired;
}
