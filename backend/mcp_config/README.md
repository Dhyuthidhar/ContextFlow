# ContextFlow MCP Server Setup

## Prerequisites
- Python 3.9+, virtualenv activated, `pip install -r requirements.txt` completed
- `.env` file filled in with real Supabase and OpenAI credentials

## Run the server manually
```bash
cd /Users/sssd/Documents/ContextFlow/backend
source .venv/bin/activate
python3 mcp_server/server.py
```
The server reads JSON-RPC from stdin and writes responses to stdout. Logs go to stderr.

## Add to Claude Code
1. Open or create `~/.claude/mcp_servers.json`
2. Copy the contents of `claude_code_config.json` into it
3. Replace `/ABSOLUTE/PATH/TO/backend` with the real path (e.g. `/Users/sssd/Documents/ContextFlow/backend`)
4. Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY` from your `.env`

## Add to Windsurf
1. Open Windsurf → Settings → MCP
2. Paste the contents of `windsurf_config.json`
3. Replace `/ABSOLUTE/PATH/TO/backend` with the real path
4. Fill in the env vars from your `.env`

## Test the server manually
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | python3 mcp_server/server.py
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | python3 mcp_server/server.py
```
Expected: JSON response with `result` containing server info or tool list.

## Run the dispatcher test script
```bash
cd /Users/sssd/Documents/ContextFlow/backend
source .venv/bin/activate
python3 mcp_server/test_server.py
```

## Important
- `command` must point to the `python3` inside your `.venv` for the AI tool to use installed packages:
  `/Users/sssd/Documents/ContextFlow/backend/.venv/bin/python3`
- Never commit real credentials — keep them in `.env` only
