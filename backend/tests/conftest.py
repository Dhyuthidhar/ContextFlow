from __future__ import annotations

import os
import socket
import sys
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# Deterministic placeholders satisfy configuration at import time. Tests replace
# every service boundary before exercising application code.
os.environ.setdefault("SUPABASE_URL", "http://127.0.0.1:54321")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("TOGETHER_API_KEY", "test-together-key")
os.environ.setdefault("MVP_USER_ID", "123e4567-e89b-12d3-a456-426614174000")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("LOG_LEVEL", "CRITICAL")


@pytest.fixture(autouse=True)
def block_external_network(monkeypatch, request):
    if request.node.get_closest_marker("live_integration"):
        yield
        return

    def fail_network(*_args, **_kwargs):
        raise AssertionError("Network access is forbidden in deterministic tests")

    monkeypatch.setattr(socket, "create_connection", fail_network)
    monkeypatch.setattr(socket.socket, "connect", fail_network)
    monkeypatch.setattr(socket.socket, "connect_ex", fail_network)
    yield
