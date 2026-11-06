from __future__ import annotations

import asyncio
import sys
import types
from types import SimpleNamespace

from mcp_server import tools


PROJECT_ID = "project-123"


class FakeBucket:
    def __init__(self, calls: list[dict]) -> None:
        self.calls = calls

    def upload(self, **kwargs):
        self.calls.append(kwargs)


class FakeInsert:
    def __init__(self, payload: dict, calls: list[dict]) -> None:
        self.payload = payload
        self.calls = calls

    def execute(self):
        self.calls.append(self.payload)
        return SimpleNamespace(data=[{"id": "document-456"}])


class FakeTable:
    def __init__(self, calls: list[dict]) -> None:
        self.calls = calls

    def insert(self, payload: dict):
        return FakeInsert(payload, self.calls)


class FakeClient:
    def __init__(self) -> None:
        self.uploads: list[dict] = []
        self.inserts: list[dict] = []

    @property
    def storage(self):
        return self

    def from_(self, bucket: str):
        assert bucket == "documents"
        return FakeBucket(self.uploads)

    def table(self, table: str):
        assert table == "documents"
        return FakeTable(self.inserts)


def install_processing_fakes(monkeypatch, chunk_count: int, chunk_calls: list[tuple]) -> None:
    extractor = types.ModuleType("file_processing.extractor")
    extractor.clean_extracted_text = lambda content: content.strip()

    chunker = types.ModuleType("file_processing.chunker")

    async def process_and_store_chunks(document_id: str, content: str) -> int:
        chunk_calls.append((document_id, content))
        return chunk_count

    chunker.process_and_store_chunks = process_and_store_chunks
    monkeypatch.setitem(sys.modules, "file_processing.extractor", extractor)
    monkeypatch.setitem(sys.modules, "file_processing.chunker", chunker)


def valid_arguments(**overrides) -> dict:
    arguments = {
        "project_id": PROJECT_ID,
        "filename": "Product brief.md",
        "file_type": "md",
        "doc_category": "prd",
        "content": "  # Approved context  ",
    }
    arguments.update(overrides)
    return arguments


def test_upload_stores_and_indexes_valid_content(monkeypatch) -> None:
    client = FakeClient()
    chunk_calls: list[tuple] = []
    monkeypatch.setattr(tools, "get_client", lambda: client)
    install_processing_fakes(monkeypatch, chunk_count=2, chunk_calls=chunk_calls)

    result = asyncio.run(tools.handle_upload_document(valid_arguments()))

    assert result["success"] is True
    assert result["data"] == {
        "document_id": "document-456",
        "filename": "Product brief.md",
        "storage_path": f"{PROJECT_ID}/Product_brief.md",
        "chunk_count": 2,
        "char_count": 18,
    }
    assert client.uploads[0]["file"] == b"  # Approved context  "
    assert client.inserts[0]["project_id"] == PROJECT_ID
    assert client.inserts[0]["doc_category"] == "prd"
    assert chunk_calls == [("document-456", "# Approved context")]


def test_upload_rejects_unsupported_file_type_before_service_access(monkeypatch) -> None:
    monkeypatch.setattr(tools, "get_client", lambda: (_ for _ in ()).throw(AssertionError("service accessed")))
    result = asyncio.run(tools.handle_upload_document(valid_arguments(file_type="docx")))
    assert result["success"] is False
    assert "file_type must be one of" in result["error"]


def test_upload_reports_partial_failure_when_no_chunks_are_created(monkeypatch) -> None:
    client = FakeClient()
    monkeypatch.setattr(tools, "get_client", lambda: client)
    install_processing_fakes(monkeypatch, chunk_count=0, chunk_calls=[])

    result = asyncio.run(tools.handle_upload_document(valid_arguments()))

    assert result["success"] is False
    assert result["data"]["partial"] is True
    assert result["data"]["document_id"] == "document-456"
    assert result["data"]["chunk_count"] == 0


def test_upload_rejects_invalid_document_category() -> None:
    result = asyncio.run(tools.handle_upload_document(valid_arguments(doc_category="contract")))
    assert result["success"] is False
    assert "doc_category must be one of" in result["error"]
