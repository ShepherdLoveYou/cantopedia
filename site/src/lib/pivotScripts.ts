/**
 * PivotPage tab navigation: builds the tab strip from <PivotTab data-pivot-tab>
 * children, syncs URL hash on scroll, handles click + ArrowLeft/Right.
 * Idempotent — dataset.wired guard short-circuits repeat init.
 */

const handlerRefs = new WeakMap<HTMLElement, {
  click: (e: Event) => void;
  scroll: () => void;
  keydown: (e: KeyboardEvent) => void;
}>();

export function initPivotPage() {
  const root = document.querySelector<HTMLElement>('.pivot-page');
  if (!root || root.dataset.wired === '1') return;
  root.dataset.wired = '1';

  const panelsEl = root.querySelector<HTMLElement>('#pivot-panels');
  const tabsEl = root.querySelector<HTMLElement>('#pivot-tabs');
  if (!panelsEl || !tabsEl) return;

  const tabs = Array.from(panelsEl.querySelectorAll<HTMLElement>('[data-pivot-tab]'));
  if (tabs.length === 0) return;

  // Build tab labels in the strip
  tabsEl.innerHTML = '';
  tabs.forEach((tab, idx) => {
    const id = tab.dataset.tabId ?? `tab-${idx}`;
    const name = tab.dataset.tabName ?? `Tab ${idx + 1}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pivot-tab-label';
    btn.id = `pivot-tab-label-${id}`;
    btn.textContent = name;
    btn.dataset.tabTarget = id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.dataset.selected === 'true' ? 'true' : 'false');
    tabsEl.appendChild(btn);
  });

  // Find initial tab — URL hash > data-selected > first
  const hash = location.hash.replace(/^#/, '');
  const initialId = tabs.find((t) => t.dataset.tabId === hash)?.dataset.tabId
    ?? tabs.find((t) => t.dataset.selected === 'true')?.dataset.tabId
    ?? tabs[0].dataset.tabId;
  const initialIdx = tabs.findIndex((t) => t.dataset.tabId === initialId);

  function scrollToTab(i: number) {
    const target = tabs[i];
    if (!target) return;
    const offset = target.offsetLeft;
    panelsEl!.scrollTo({ left: offset, behavior: 'smooth' });
  }

  function activeTabIdx(): number {
    const sl = panelsEl!.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    tabs.forEach((t, i) => {
      const d = Math.abs(t.offsetLeft - sl);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function syncTabStrip(activeIdx: number) {
    const id = tabs[activeIdx]?.dataset.tabId;
    if (!id) return;
    tabsEl!.querySelectorAll<HTMLElement>('.pivot-tab-label').forEach((b) => {
      b.setAttribute('aria-selected', b.dataset.tabTarget === id ? 'true' : 'false');
    });
    if (location.hash.replace(/^#/, '') !== id) {
      history.replaceState(null, '', `#${id}`);
    }
  }

  // Initial scroll
  if (initialIdx > 0) {
    panelsEl.style.scrollBehavior = 'auto';
    panelsEl.scrollLeft = tabs[initialIdx].offsetLeft;
    requestAnimationFrame(() => { panelsEl.style.scrollBehavior = 'smooth'; });
  }
  syncTabStrip(initialIdx >= 0 ? initialIdx : 0);

  // Wire click
  const clickHandler = (e: Event) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('.pivot-tab-label');
    if (!btn) return;
    const id = btn.dataset.tabTarget;
    const idx = tabs.findIndex((t) => t.dataset.tabId === id);
    if (idx >= 0) scrollToTab(idx);
  };
  tabsEl.addEventListener('click', clickHandler);

  // Wire scroll → sync tab strip
  let scrollT: number | undefined;
  const scrollHandler = () => {
    window.clearTimeout(scrollT);
    scrollT = window.setTimeout(() => syncTabStrip(activeTabIdx()), 80);
  };
  panelsEl.addEventListener('scroll', scrollHandler, { passive: true });

  // Wire keydown
  const keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToTab(Math.max(0, activeTabIdx() - 1)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollToTab(Math.min(tabs.length - 1, activeTabIdx() + 1)); }
  };
  root.addEventListener('keydown', keydownHandler);

  handlerRefs.set(root, { click: clickHandler, scroll: scrollHandler, keydown: keydownHandler });
}

export function teardownPivotPage() {
  const root = document.querySelector<HTMLElement>('.pivot-page');
  if (!root) return;
  const refs = handlerRefs.get(root);
  if (refs) {
    const tabsEl = root.querySelector<HTMLElement>('#pivot-tabs');
    const panelsEl = root.querySelector<HTMLElement>('#pivot-panels');
    tabsEl?.removeEventListener('click', refs.click);
    panelsEl?.removeEventListener('scroll', refs.scroll);
    root.removeEventListener('keydown', refs.keydown);
    handlerRefs.delete(root);
  }
  delete root.dataset.wired;
}
