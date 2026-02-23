#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

# Ensure backend root is on the path regardless of cwd
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BACKEND_DIR)

_PROJECTS_FILE = os.path.join(_BACKEND_DIR, "projects.json")

# ── Colour helpers ────────────────────────────────────────────────────────────
try:
    from colorama import Fore, Style, init as _colorama_init
    _colorama_init(autoreset=True)
    _HAS_COLOR = True
except ImportError:
    _HAS_COLOR = False

    class _Noop:
        def __getattr__(self, _: str) -> str:
            return ""

    Fore = _Noop()   # type: ignore[assignment]
    Style = _Noop()  # type: ignore[assignment]


def _c(color: str, text: str) -> str:
    return f"{color}{text}{Style.RESET_ALL}" if _HAS_COLOR else text


def _divider() -> str:
    return _c(Fore.CYAN, "━" * 52)


def _bold(text: str) -> str:
    return _c(Style.BRIGHT, text)


# ── Project lookup ────────────────────────────────────────────────────────────
def _load_projects() -> dict[str, str]:
    if not os.path.exists(_PROJECTS_FILE):
        return {}
    with open(_PROJECTS_FILE) as f:
        return json.load(f)


def _resolve_project(name: str) -> str | None:
    projects = _load_projects()
    key = name.lower().strip()
    return projects.get(key)


# ── Formatting ────────────────────────────────────────────────────────────────
def _pct(similarity: float) -> str:
    return f"{round(similarity * 100)}%"


def _print_results(query: str, project_name: str | None, data: dict) -> None:
    project_context = data.get("project_context") or []
    principles = data.get("principles") or []
    related = data.get("related_context") or {}
    meta = data.get("meta") or {}

    print()
    print(_divider())
    label = f"ContextFlow  |  Query: \"{query}\""
    print(_bold(label))
    if project_name:
        print(f"Project: {_c(Fore.YELLOW, project_name.title())}")
    print(_divider())

    # ── Doc chunks ──
    print()
    print(_bold(_c(Fore.GREEN, "📄 FROM YOUR DOCS")))
    if project_context:
        for chunk in project_context:
            fname = chunk.get("filename", "unknown")
            content = chunk.get("content", "").strip().replace("\n", " ")
            if len(content) > 160:
                content = content[:157] + "..."
            sim = chunk.get("similarity", 0)
            print()
            print(f"  {_c(Fore.YELLOW, f'[{fname}]')}")
            print(f"  \"{content}\"")
            print(f"  {_c(Fore.CYAN, f'Relevance: {_pct(sim)}')}")
    else:
        print(f"  {_c(Fore.WHITE, 'No matching document chunks found.')}")

    # ── Principles ──
    print()
    print(_bold(_c(Fore.MAGENTA, "💡 PRINCIPLES")))
    if principles:
        for p in principles:
            content = p.get("content", "").strip()
            confidence = p.get("confidence") or p.get("confidence_score") or 0
            when_use = p.get("when_to_use")
            when_not = p.get("when_not_to_use")
            conf_pct = f"{round(float(confidence) * 100)}%" if confidence else "n/a"
            print()
            print(f"  {_c(Fore.WHITE, content)} {_c(Fore.CYAN, f'(confidence: {conf_pct})')}")
            if when_use:
                print(f"  {_c(Fore.GREEN, '✓ Use when:')} {when_use}")
            if when_not:
                print(f"  {_c(Fore.RED, '✗ Avoid when:')} {when_not}")
    else:
        print(f"  {_c(Fore.WHITE, 'No principles found for this query.')}")

    # ── Related context ──
    related_items: list[tuple[str, str]] = []
    for category, items in related.items():
        if isinstance(items, list):
            for item in items:
                content = item.get("content", "") if isinstance(item, dict) else str(item)
                related_items.append((category, content))

    if related_items:
        print()
        print(_bold(_c(Fore.BLUE, "🔗 RELATED")))
        for category, content in related_items:
            print(f"  • {content} {_c(Fore.CYAN, f'({category})')}")

    # ── Footer ──
    doc_count = meta.get("storage1_count", len(project_context))
    prin_count = meta.get("storage2_count", len(principles))
    rel_count = sum(len(v) for v in related.values() if isinstance(v, list))

    print()
    print(_divider())
    footer = f"📊 Sources: {doc_count} doc chunks  |  {prin_count} principles  |  {rel_count} related"
    print(_c(Fore.CYAN, footer))
    print(_divider())
    print()


def _print_projects(projects: dict[str, str]) -> None:
    print()
    print(_divider())
    print(_bold("ContextFlow  |  Available Projects"))
    print(_divider())
    if not projects:
        print(f"  {_c(Fore.YELLOW, 'No projects configured.')}")
        print(f"  Add entries to {_PROJECTS_FILE}")
    else:
        for name, uuid in projects.items():
            print(f"  {_c(Fore.YELLOW, name.ljust(20))}  {_c(Fore.CYAN, uuid)}")
    print(_divider())
    print()


# ── Main ──────────────────────────────────────────────────────────────────────
async def _run(query: str, project_id: str | None, project_name: str | None, limit: int) -> None:
    from orchestrator.orchestrator import orchestrate_query

    result = await orchestrate_query(
        query=query,
        project_id=project_id,
        category_hint=None,
        limit=limit,
    )

    if result.get("error"):
        print(_c(Fore.RED, f"\n✗ Error: {result['error']}\n"))
        sys.exit(1)

    _print_results(query, project_name, result)


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="cf",
        description="ContextFlow CLI — query your project knowledge base",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  python cf.py "how should I handle auth?"
  python cf.py "what database patterns should I use?" --project worcoor
  python cf.py --list-projects
""",
    )
    parser.add_argument("query", nargs="?", help="Your question")
    parser.add_argument("--project", "-p", metavar="NAME", help="Project name (from projects.json)")
    parser.add_argument("--project-id", metavar="UUID", help="Project UUID directly")
    parser.add_argument("--limit", "-n", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("--list-projects", "-l", action="store_true", help="List configured projects")

    args = parser.parse_args()

    if args.list_projects:
        _print_projects(_load_projects())
        return

    if not args.query:
        parser.print_help()
        sys.exit(0)

    project_id: str | None = args.project_id
    project_name: str | None = None

    if args.project and not project_id:
        project_id = _resolve_project(args.project)
        if project_id:
            project_name = args.project
        else:
            print(_c(Fore.RED, f"\n✗ Project '{args.project}' not found in projects.json"))
            print(f"  Run {_c(Fore.CYAN, 'cf --list-projects')} to see available projects.\n")
            sys.exit(1)

    try:
        asyncio.run(_run(args.query, project_id, project_name, args.limit))
    except KeyboardInterrupt:
        print("\nCancelled.")
    except Exception as exc:
        print(_c(Fore.RED, f"\n✗ Unexpected error: {exc}\n"))
        sys.exit(1)


if __name__ == "__main__":
    main()
