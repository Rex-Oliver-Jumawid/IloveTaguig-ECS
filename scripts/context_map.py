#!/usr/bin/env python3
"""Print routing metadata from context/*.md frontmatter."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


REQUIRED_FIELDS = ("context_role", "owner", "read_when", "stability", "update_mode")


def find_context_root(start: Path) -> Path | None:
    current = start if start.is_dir() else start.parent
    for candidate in (current, *current.parents):
        if (candidate / "context").is_dir():
            return candidate
    return None


def default_root() -> Path:
    return find_context_root(Path.cwd()) or find_context_root(Path(__file__).resolve()) or Path.cwd()


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str | None]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] != "---":
        return {}, "missing opening frontmatter delimiter"

    data: dict[str, str] = {}
    for index, line in enumerate(lines[1:], start=2):
        if line == "---":
            missing = [field for field in REQUIRED_FIELDS if field not in data]
            if missing:
                return data, f"missing required field(s): {', '.join(missing)}"
            return data, None
        if ":" not in line:
            return data, f"invalid frontmatter line {index}: {line}"
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip()

    return data, "missing closing frontmatter delimiter"


def collect(root: Path) -> tuple[list[dict], list[str]]:
    rows: list[dict] = []
    errors: list[str] = []
    for path in sorted((root / "context").glob("*.md")):
        data, error = parse_frontmatter(path)
        row = {"file": path.name, **data}
        rows.append(row)
        if error:
            errors.append(f"{path.relative_to(root)}: {error}")
    return rows, errors


def print_text(rows: list[dict]) -> None:
    for row in rows:
        print(row["file"])
        print(f"  role: {row.get('context_role', '')}")
        print(f"  owner: {row.get('owner', '')}")
        print(f"  read_when: {row.get('read_when', '')}")
        print(f"  stability: {row.get('stability', '')}")
        print(f"  update_mode: {row.get('update_mode', '')}")
        print()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Show context-file routing metadata without reading full file bodies."
    )
    parser.add_argument("--root", type=Path, default=None, help="Project root containing context/.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of text.")
    parser.add_argument("--check", action="store_true", help="Fail if frontmatter is missing or incomplete.")
    args = parser.parse_args()

    root = args.root.resolve() if args.root else default_root()
    rows, errors = collect(root)
    if args.json:
        print(json.dumps(rows, indent=2, sort_keys=True))
    else:
        print_text(rows)

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1 if args.check else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
