from __future__ import annotations

import os
import socket
import sys
import types
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# Inject a non-secret configuration module before application imports. This keeps
# offline tests independent from environment credentials while preserving the
# production configuration contract used by application modules.
if os.environ.get("RUN_LIVE_INTEGRATION") != "1":
    test_config = types.ModuleType("utils.config")
    test_config.SUPABASE_URL = "https://offline.invalid"
    test_config.SUPABASE_SERVICE_KEY = "unused"
    test_config.SUPABASE_ANON_KEY = "unused"
    test_config.OPENAI_API_KEY = "unused"
    test_config.TOGETHER_API_KEY = "unused"
    test_config.MVP_USER_ID = "123e4567-e89b-12d3-a456-426614174000"
    test_config.ENVIRONMENT = "test"
    test_config.LOG_LEVEL = "CRITICAL"
    sys.modules["utils.config"] = test_config


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
