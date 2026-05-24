# Cantopedia Pipeline

The Python research pipeline for 粵食典 · Cantopedia.

Reads the menu transcription and license-clean upstream sources
(Wikipedia, Wikimedia Commons, USDA, HK gov terminology), produces validated
YAML under `data/`, fetched into the Astro site at build time.

## Setup

```bash
conda activate cantopedia          # see ../pipeline/environment.yml
pip install -e ./pipeline
```

## Commands

```bash
# v0.1-alpha commands
python -m pipeline init             # generate 66 stub dishes from transcription
python -m pipeline validate         # full schema check (pydantic mirror of Zod)
python -m pipeline status           # progress: stub/draft/complete counts

# planned for v0.1-beta (need API keys)
python -m pipeline fetch dish <id>          # Wikipedia/USDA/etc fetch
python -m pipeline synthesize dish <id>     # Claude API → draft method
python -m pipeline images dish <id>         # Wikimedia/Unsplash/AI image
```

## Architecture

Five layers — see [`../docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md`](../docs/superpowers/specs/2026-05-24-cantonese-cuisine-design.md) §7.

- `pipeline/sources/` — adapters for upstream APIs
- `pipeline/models.py` — pydantic models, kept in parity with `site/src/content.config.ts`
- `pipeline/transcription.py` — the 66-dish source data from menu sheets
- `pipeline/cli.py` — Click CLI entry points
- `pipeline/cache/` — fetched payload cache (gitignored)
