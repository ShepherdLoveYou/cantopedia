<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { createFocusTrap, type FocusTrap } from 'focus-trap';

interface Category {
  id: string;
  name: string;
  count: number;
  iconPaths: string;
}
interface LocaleEntry {
  code: 'zh' | 'yue' | 'en';
  label: string;
}
interface Dict {
  menu: string;
  browse: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  auto: string;
  search: string;
  github: string;
}

const props = defineProps<{
  locale: 'zh' | 'yue' | 'en';
  base: string;
  brandName: string;
  brandSubtitle: string;
  categories: Category[];
  locales: LocaleEntry[];
  dict: Dict;
}>();

// ---------- state ----------
const open = ref(false);
const themeChoice = ref<'auto' | 'light' | 'dark'>('auto');
const currentPath = ref('');
const drawerEl = ref<HTMLElement | null>(null);
const hamburgerEl = ref<HTMLButtonElement | null>(null);
let trap: FocusTrap | null = null;

// ---------- locale switcher: dynamic destinations ----------
const localeDestination = computed(() => (target: 'zh' | 'yue' | 'en') => {
  const baseStripped = props.base
    ? currentPath.value.replace(new RegExp('^' + props.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')
    : currentPath.value;
  const parts = baseStripped.split('/').filter(Boolean);
  if (parts.length === 0 || !['zh', 'yue', 'en'].includes(parts[0])) {
    return `${props.base}/${target}`;
  }
  parts[0] = target;
  return `${props.base}/${parts.join('/')}`;
});

const currentLocale = computed<'zh' | 'yue' | 'en'>(() => {
  const baseStripped = props.base
    ? currentPath.value.replace(new RegExp('^' + props.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')
    : currentPath.value;
  const parts = baseStripped.split('/').filter(Boolean);
  return (['zh', 'yue', 'en'].includes(parts[0]) ? parts[0] : props.locale) as 'zh' | 'yue' | 'en';
});

// ---------- theme ----------
function applyTheme(choice: 'auto' | 'light' | 'dark') {
  const dark = choice === 'dark' || (choice === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themeChoice = choice;
  try { localStorage.setItem('cantopedia-theme', choice); } catch {}
  themeChoice.value = choice;
}
function readSavedTheme(): 'auto' | 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('cantopedia-theme') || 'auto';
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
  } catch {}
  return 'auto';
}

// ---------- open / close ----------
async function openDrawer() {
  open.value = true;
  await nextTick();
  if (!trap && drawerEl.value) {
    trap = createFocusTrap(drawerEl.value, {
      onDeactivate: () => hamburgerEl.value?.focus(),
      clickOutsideDeactivates: true,
      escapeDeactivates: true,
      returnFocusOnDeactivate: true,
      fallbackFocus: drawerEl.value,
    });
  }
  trap?.activate();
}
function closeDrawer() {
  open.value = false;
  trap?.deactivate();
}
function toggle() {
  open.value ? closeDrawer() : openDrawer();
}

// ---------- lifecycle ----------
function syncRouteState() {
  currentPath.value = location.pathname.replace(/\/$/, '');
}

onMounted(() => {
  syncRouteState();
  themeChoice.value = readSavedTheme();
  applyTheme(themeChoice.value);
  document.addEventListener('astro:page-load', () => {
    syncRouteState();
    applyTheme(readSavedTheme());
    closeDrawer();
  });
  document.addEventListener('astro:before-preparation', () => closeDrawer());
});

onBeforeUnmount(() => {
  trap?.deactivate();
});
</script>

<template>
  <button
    ref="hamburgerEl"
    class="hamburger"
    type="button"
    :aria-controls="'nav-drawer'"
    :aria-expanded="open ? 'true' : 'false'"
    :aria-label="dict.menu"
    @click="toggle"
  >
    <span class="hamburger-bar" :class="{ on: open }"></span>
    <span class="hamburger-bar" :class="{ on: open }"></span>
    <span class="hamburger-bar" :class="{ on: open }"></span>
  </button>

  <Teleport to="body">
    <div class="drawer-scrim" :class="{ open }" @click="closeDrawer"></div>
    <aside
      ref="drawerEl"
      id="nav-drawer"
      class="nav-drawer"
      :class="{ open }"
      :aria-hidden="!open"
    >
      <div class="drawer-inner">
        <div class="drawer-brand">
          <span class="brand-seal" aria-hidden="true">粵</span>
          <span class="drawer-brand-name">{{ brandName }}<br /><small>{{ brandSubtitle }}</small></span>
        </div>

        <a class="drawer-search-link" :href="`${base}/${currentLocale}/search`" @click="closeDrawer">
          <span class="drawer-search-icon" aria-hidden="true">🔎</span>
          <span>{{ dict.search }}</span>
        </a>

        <div class="drawer-section-label">{{ dict.browse }}</div>
        <nav class="drawer-cats">
          <a
            v-for="cat in categories"
            :key="cat.id"
            class="drawer-cat"
            :href="`${base}/${currentLocale}/browse/${cat.id}`"
            :data-cat="cat.id"
            @click="closeDrawer"
          >
            <span class="drawer-cat-icon" v-html="cat.iconPaths"></span>
            <span class="drawer-cat-name">{{ cat.name }}</span>
            <span class="drawer-cat-count">{{ cat.count }}</span>
          </a>
        </nav>

        <hr class="drawer-rule" />

        <div class="drawer-section-label">{{ dict.language }}</div>
        <div class="drawer-locales">
          <a
            v-for="loc in locales"
            :key="loc.code"
            class="drawer-locale"
            :class="{ active: loc.code === currentLocale }"
            :href="localeDestination(loc.code)"
          >{{ loc.label }}</a>
        </div>

        <hr class="drawer-rule" />

        <div class="drawer-section-label">{{ dict.theme }}</div>
        <div class="drawer-themes" role="radiogroup" :aria-label="dict.theme">
          <button
            v-for="opt in [
              { id: 'light', icon: '☀', label: dict.light },
              { id: 'dark', icon: '☾', label: dict.dark },
              { id: 'auto', icon: '⚙', label: dict.auto },
            ]"
            :key="opt.id"
            class="drawer-theme"
            type="button"
            :aria-pressed="themeChoice === opt.id ? 'true' : 'false'"
            @click="applyTheme(opt.id as any)"
          ><span aria-hidden="true">{{ opt.icon }}</span> {{ opt.label }}</button>
        </div>

        <div class="drawer-foot">
          <a href="https://github.com/ShepherdLoveYou/cantopedia">{{ dict.github }} →</a>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<style>
/* Hamburger button (placed in nav by parent layout) */
.hamburger {
  appearance: none;
  background: transparent;
  border: 0;
  width: 36px; height: 36px;
  display: inline-flex; flex-direction: column; justify-content: center; align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 0;
  color: var(--t-nav-ink);
}
.hamburger-bar {
  display: block; width: 18px; height: 2px;
  background: currentColor;
  transition: transform var(--fluent-duration-normal) var(--fluent-curve-easy-ease),
              opacity var(--fluent-duration-fast) ease;
}
.hamburger-bar.on:nth-of-type(1) { transform: translateY(6px) rotate(45deg); }
.hamburger-bar.on:nth-of-type(2) { opacity: 0; }
.hamburger-bar.on:nth-of-type(3) { transform: translateY(-6px) rotate(-45deg); }

/* Drawer + scrim */
.drawer-scrim {
  position: fixed; inset: 0;
  background: var(--t-scrim);
  opacity: 0; pointer-events: none;
  transition: opacity var(--fluent-duration-normal) var(--fluent-curve-easy-ease);
  z-index: 90;
}
.drawer-scrim.open { opacity: 1; pointer-events: auto; }

.nav-drawer {
  position: fixed; top: 0; bottom: 0; left: 0;
  width: clamp(260px, 78vw, 320px);
  background: var(--t-drawer-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  color: var(--t-drawer-ink);
  transform: translateX(-100%);
  transition: transform var(--fluent-duration-gentle) var(--fluent-curve-easy-ease);
  z-index: 100;
  overflow-y: auto;
  box-shadow: 2px 0 16px rgba(0,0,0,0.35);
}
@supports not (backdrop-filter: blur(1px)) {
  .nav-drawer { background: var(--t-acrylic-fallback); }
}
.nav-drawer.open { transform: translateX(0); }
.drawer-inner { padding: 1.25rem 1rem 2rem; display: flex; flex-direction: column; gap: 0.5rem; }

.drawer-brand { display: flex; align-items: center; gap: 0.75rem; padding: 0.25rem 0 0.75rem; }
.drawer-brand-name { font-family: var(--sans), var(--sans-zh); font-weight: 300; font-size: 1.5rem; line-height: 1.1; }
.drawer-brand-name small { display: block; font-size: 0.7rem; opacity: 0.6; letter-spacing: 0.16em; text-transform: uppercase; }

.drawer-search-link {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.65rem 0.5rem;
  margin: 0.25rem 0 0.5rem;
  color: var(--t-drawer-ink) !important;
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.04);
  font-family: var(--sans), var(--sans-zh);
  font-weight: 300;
  font-size: 0.95rem;
  transition: background var(--fluent-duration-fast) ease;
}
.drawer-search-link:hover { background: rgba(255,255,255,0.10); }
.drawer-search-icon { font-size: 0.95rem; }

.drawer-section-label {
  font-family: var(--sans);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--t-drawer-dim);
  margin: 1rem 0 0.4rem;
  font-weight: 400;
}

.drawer-cats { display: flex; flex-direction: column; }
.drawer-cat {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0.5rem;
  color: var(--t-drawer-ink) !important;
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background var(--fluent-duration-fast) ease, border-color var(--fluent-duration-fast) ease;
}
.drawer-cat:hover { background: rgba(255,255,255,0.06); border-left-color: var(--m-red); color: var(--t-drawer-ink) !important; }
.drawer-cat-icon { display: inline-flex; }
.drawer-cat-name { font-family: var(--sans), var(--sans-zh); font-size: 1.05rem; font-weight: 300; }
.drawer-cat-count {
  font-family: var(--sans);
  font-size: 0.82rem;
  opacity: 0.7;
  padding: 1px 6px;
  background: rgba(255,255,255,0.10);
  letter-spacing: 0.04em;
}

.drawer-rule { border: 0; border-top: 1px solid rgba(255,255,255,0.10); margin: 0.5rem 0; }

.drawer-locales { display: flex; gap: 0.25rem; }
.drawer-locale {
  flex: 1;
  text-align: center;
  padding: 0.6rem 0.25rem;
  font-family: var(--sans), var(--sans-zh);
  font-size: 0.9rem;
  font-weight: 300;
  color: var(--t-drawer-dim) !important;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  text-decoration: none;
}
.drawer-locale.active { color: var(--t-drawer-ink) !important; background: rgba(255,255,255,0.14); border-color: var(--m-red); }

.drawer-themes { display: flex; gap: 0.25rem; }
.drawer-theme {
  flex: 1;
  appearance: none;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--t-drawer-dim);
  padding: 0.6rem 0.25rem;
  font-family: var(--sans), var(--sans-zh);
  font-size: 0.88rem;
  font-weight: 300;
  cursor: pointer;
  transition: background var(--fluent-duration-fast) ease, color var(--fluent-duration-fast) ease;
}
.drawer-theme:hover { background: rgba(255,255,255,0.10); color: var(--t-drawer-ink); }
.drawer-theme[aria-pressed="true"] { background: rgba(255,255,255,0.18); color: var(--t-drawer-ink); border-color: var(--m-red); }

.drawer-foot { margin-top: 1.75rem; font-size: 0.9rem; opacity: 0.75; font-weight: 300; }
.drawer-foot a { color: var(--t-drawer-ink); }

@media (prefers-reduced-motion: reduce) {
  .nav-drawer, .drawer-scrim, .hamburger-bar { transition: none !important; }
}
</style>
