import asyncio
import time
import typer
from rich.console import Console
from rich.table import Table

console = Console()
app = typer.Typer()

try:
    from utils.config import (
        SUPABASE_URL,
        SUPABASE_SERVICE_KEY,
        OPENAI_API_KEY,
        MVP_USER_ID,
    )
    _config_ok = True
    _config_error = ""
except Exception as exc:
    _config_ok = False
    _config_error = str(exc)

try:
    from utils.supabase_client import get_client
    _supabase_import_ok = True
    _supabase_import_error = ""
except Exception as exc:
    _supabase_import_ok = False
    _supabase_import_error = str(exc)

try:
    from utils.embeddings import generate_embedding
    _embeddings_import_ok = True
    _embeddings_import_error = ""
except Exception as exc:
    _embeddings_import_ok = False
    _embeddings_import_error = str(exc)


def _ok(label: str, detail: str = "") -> bool:
    msg = f"[green]✓[/green] {label}"
    if detail:
        msg += f" [dim]{detail}[/dim]"
    console.print(msg)
    return True


def _fail(label: str, detail: str = "") -> bool:
    msg = f"[red]✗[/red] {label}"
    if detail:
        msg += f" [dim]{detail}[/dim]"
    console.print(msg)
    return False


def check_env_vars() -> bool:
    console.print("\n[bold]1. ENV VARS LOADED[/bold]")
    if not _config_ok:
        return _fail("Config import failed", _config_error)

    all_pass = True
    for name, value in [
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY),
        ("OPENAI_API_KEY", OPENAI_API_KEY),
    ]:
        if value:
            preview = value[:8] + "..."
            _ok(f"{name}", preview)
        else:
            _fail(f"{name}", "missing or empty")
            all_pass = False
    return all_pass


def check_supabase_connection() -> bool:
    console.print("\n[bold]2. SUPABASE CONNECTION[/bold]")
    if not _supabase_import_ok:
        return _fail("supabase_client import failed", _supabase_import_error)
    try:
        client = get_client()
        client.table("users").select("id").limit(1).execute()
        return _ok("Connected to Supabase")
    except Exception as exc:
        return _fail("Connection failed", str(exc))


def check_tables_exist() -> bool:
    console.print("\n[bold]3. REQUIRED TABLES EXIST[/bold]")
    if not _supabase_import_ok:
        return _fail("supabase_client import failed", _supabase_import_error)

    tables = [
        "users", "projects", "documents", "document_chunks",
        "patterns", "decisions", "principles", "principle_evidence", "analysis_jobs",
    ]
    client = get_client()
    all_pass = True
    for table in tables:
        try:
            client.table(table).select("id").limit(1).execute()
            _ok(table)
        except Exception as exc:
            _fail(table, str(exc))
            all_pass = False
    return all_pass


def check_mvp_user() -> bool:
    console.print("\n[bold]4. MVP USER EXISTS[/bold]")
    if not _supabase_import_ok or not _config_ok:
        return _fail("Dependency import failed")
    try:
        client = get_client()
        response = client.table("users").select("id").eq("id", MVP_USER_ID).execute()
        if response.data:
            return _ok("MVP user found", MVP_USER_ID)
        return _fail("MVP user not found", f"id={MVP_USER_ID}")
    except Exception as exc:
        return _fail("Query failed", str(exc))


def check_principles_seeded() -> bool:
    console.print("\n[bold]5. PRINCIPLES SEEDED[/bold]")
    if not _supabase_import_ok:
        return _fail("supabase_client import failed", _supabase_import_error)
    try:
        client = get_client()
        response = client.table("principles").select("id", count="exact").eq("source", "generic").execute()
        count = response.count if response.count is not None else len(response.data)
        if count >= 50:
            return _ok(f"Generic principles seeded", f"{count} rows")
        return _fail(f"Insufficient generic principles", f"{count} found, need >= 50")
    except Exception as exc:
        return _fail("Query failed", str(exc))


async def _check_openai_async() -> tuple[bool, str]:
    if not _embeddings_import_ok:
        return False, _embeddings_import_error
    try:
        start = time.monotonic()
        result = await generate_embedding("health check test")
        latency_ms = int((time.monotonic() - start) * 1000)
        if isinstance(result, list) and len(result) == 1536:
            return True, f"{latency_ms}ms, 1536 dims"
        return False, f"Unexpected result length: {len(result)}"
    except Exception as exc:
        return False, str(exc)


def check_openai_reachable() -> bool:
    console.print("\n[bold]6. OPENAI API REACHABLE[/bold]")
    success, detail = asyncio.run(_check_openai_async())
    if success:
        return _ok("Embedding generated", detail)
    return _fail("OpenAI call failed", detail)


def check_storage_bucket() -> bool:
    console.print("\n[bold]7. SUPABASE STORAGE BUCKET[/bold]")
    if not _supabase_import_ok:
        return _fail("supabase_client import failed", _supabase_import_error)
    try:
        client = get_client()
        client.storage.get_bucket("documents")
        return _ok("Bucket 'documents' exists")
    except Exception as exc:
        return _fail("Bucket 'documents' not found", str(exc))


@app.command()
def main() -> None:
    console.print("[bold cyan]ContextFlow Backend Health Check[/bold cyan]")
    console.print("=" * 48)

    results = [
        check_env_vars(),
        check_supabase_connection(),
        check_tables_exist(),
        check_mvp_user(),
        check_principles_seeded(),
        check_openai_reachable(),
        check_storage_bucket(),
    ]

    failed = results.count(False)
    console.print("\n" + "=" * 48)
    if failed == 0:
        console.print("[bold green]✅ All systems operational — ContextFlow backend ready[/bold green]")
    else:
        console.print(f"[bold red]❌ {failed} check{'s' if failed > 1 else ''} failed — fix above errors before proceeding[/bold red]")

    raise typer.Exit(code=0 if failed == 0 else 1)


if __name__ == "__main__":
    app()
