# UWP Visual Overhaul — Phase 3+ Design Stub

**Status:** placeholder / design contract reference; not yet brainstormed in detail.

**Date stub written:** 2026-05-24
**Author:** Claude (during Phase 2 brainstorm)

## Visual contract

The interactive prototype at [`docs/prototypes/2026-05-24-uwp-mock.html`](../../prototypes/2026-05-24-uwp-mock.html) (committed `b9a8b3c`) is the approved design contract for Phase 3+ work. User explicitly approved all 5 interactions in that prototype:

1. Start Screen tile-size variants (1 WIDE + 3 MEDIUM + 4 SMALL)
2. 3D directional tilt press
3. Live Tile flip on WIDE main (8s X-axis, dictionary metrics on back)
4. Acrylic hamburger drawer (left-side, blur 25 saturate 140 at 0.65 opacity, edge-swipe gesture)
5. Dark/Light dual mode + accent picker (Win Blue / Lumia Green / Crimson Red)

Plus the global rules from the same prototype:
- Zero-radius everywhere (AppBar circular buttons exempted)
- Inline monoline SVG icons per category (replacing emoji)
- iOS safe-area-inset handling, touch-action manipulation
- Bottom AppBar with system action buttons

## Suggested phase decomposition

The prototype is large enough that porting it to the Astro site in one go would be 3-5 sessions of work. Suggested split (re-brainstorm before each phase):

| Phase | Scope | Why this size |
|---|---|---|
| **Phase 3** | Zero-radius enforcement + 3D directional tilt press + replace 8 category emoji with inline SVG icons | All additive, low-risk, no major restructure. Visible polish that layers on Phase 2 cleanly. 1 session. |
| **Phase 4** | Start Screen homepage redesign (tile-size variants) + Live Tile flip on WIDE main | Major homepage restructure but bounded scope. Live Tile uses static "dictionary metrics" back face (no images required). 1-2 sessions. |
| **Phase 5** | Dark/Light dual mode + accent picker + bottom AppBar | Theming refactor: every existing color literal becomes a token; many files touched but mechanical. AppBar is the UI affordance for the toggles. 2 sessions. |
| **Phase 6** | Acrylic hamburger drawer + edge-swipe gesture | Adds an additional nav paradigm parallel to the pivot strip (they coexist). Acrylic blur requires browser support audit. 1 session. |
| **Phase 7+** | Wide-tile photo flip (depends on dish images pipeline being unblocked), A-Z jumping grid (depends on Pagefind), Continuum dominos page transitions | Defer until dependencies land. |

## Constraints to honor during Phase 3+

- The existing Metro palette (`--m-red`, `--m-blue`, etc.) is intentionally varied per category. Don't replace with monochrome — the prototype keeps per-category tile colors and only the WIDE main tile tracks the global `--accent`.
- Existing pivot strip + dish-card morph (Phase 2) and ClientRouter (v1) must keep working through all Phase 3+ changes. Treat them as foundations.
- All animation tokens come from `:root` (Fluent-borrowed). Do not introduce ad-hoc magic-number durations or curves.
- Phase 6 hamburger drawer is ADDITIVE to the pivot strip. Both coexist (in WP10 itself, pivot was for in-context lateral flick; hamburger was for jump-anywhere navigation). Do NOT replace pivot with drawer.

## Open questions to resolve when brainstorming each phase

**Phase 3:**
- SVG icon style: pure outline or filled? Stroke width?
- Should tilt apply to dish-cards too, not just live tiles?

**Phase 4:**
- Tile size mapping: keep prototype's rule (`dishes ≥ 20 → WIDE, 7-19 → MEDIUM, <7 → SMALL`)? Or manual override per category?
- Live Tile flip cadence: 8s as prototype, or slower?
- What goes on the back face? Prototype uses static metrics; could rotate through dishes after images land.

**Phase 5:**
- Default theme on first visit: dark (per prototype) or light (per existing site)? Persist user choice in localStorage?
- Where does the theme toggle live in Astro? Bottom AppBar like the prototype, or somewhere else?
- Accent palette: 3 colors per prototype, or expand to more (Mica/Cobalt/Magenta etc)?

**Phase 6:**
- When drawer is open, does the pivot strip become hidden / disabled?
- Acrylic fallback for browsers without `backdrop-filter`: solid translucent? No fallback?

## Process notes

When starting any Phase 3+ work:

1. Re-invoke `/superpowers:brainstorming` with this stub as context
2. Reference the prototype as the visual contract; don't redesign
3. Pick exactly one phase per brainstorming session
4. Produce a fresh, full design spec for that phase (this stub is NOT that spec)
5. Then writing-plans → execute as usual

The prototype is the source of truth for visual + interaction direction. Subsequent phase specs only need to describe HOW to port it to Astro, not WHAT to build.
