"""YAML I/O wrappers tuned for Cantopedia data files.

We use ruamel.yaml (round-trip mode) so that human edits to YAML files
preserve comments, ordering, and quotation styles when we read+write.
"""

from __future__ import annotations

from io import StringIO
from pathlib import Path
from typing import Any

from ruamel.yaml import YAML

_yaml = YAML(typ="rt")
_yaml.indent(mapping=2, sequence=4, offset=2)
_yaml.width = 4096
_yaml.allow_unicode = True
_yaml.preserve_quotes = True
_yaml.default_flow_style = False


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return _yaml.load(f)


def dump_yaml(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        _yaml.dump(data, f)


def dump_yaml_str(data: Any) -> str:
    buf = StringIO()
    _yaml.dump(data, buf)
    return buf.getvalue()
