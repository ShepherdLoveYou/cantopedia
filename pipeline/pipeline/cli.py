"""Cantopedia pipeline CLI: `python -m pipeline ...`."""

from __future__ import annotations

import click

from pipeline import __version__
from pipeline.commands.fetch import fetch_cmd
from pipeline.commands.init import init_cmd
from pipeline.commands.status import status_cmd
from pipeline.commands.validate import validate_cmd


@click.group()
@click.version_option(__version__, prog_name="cantopedia-pipeline")
def cli() -> None:
    """Cantopedia · 粵食典 — research and content pipeline.

    Common flows:

      \b
      # First-time setup
      python -m pipeline init           # generate 66 stub dishes
      python -m pipeline validate        # verify schemas
      python -m pipeline status          # see progress

      \b
      # Enrich a dish with upstream sources
      python -m pipeline fetch dish 016
    """


cli.add_command(init_cmd)
cli.add_command(validate_cmd)
cli.add_command(status_cmd)
cli.add_command(fetch_cmd)


if __name__ == "__main__":
    cli()
