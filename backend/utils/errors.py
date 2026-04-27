"""Structured exception hierarchy and small helpers for ContextFlow.

Replaces the silent-failure pattern documented in
docs/audit/CLAUDE_CODE_ACTION_PLAN_ADDENDUM.md Task 0.5. Every recoverable
failure surfaces as a ContextFlowError carrying a correlation_id, so the
caller can decide what to do — never swallow.
"""
from __future__ import annotations

import functools
import json
import logging
import uuid
from typing import Any, Awaitable, Callable, TypeVar

logger = logging.getLogger("contextflow")


def new_correlation_id() -> str:
    return str(uuid.uuid4())


class ContextFlowError(Exception):
    """Base for expected failures we recover from. Always carries correlation_id."""

    def __init__(self, message: str, *, correlation_id: str, recoverable: bool = True):
        super().__init__(message)
        self.correlation_id = correlation_id
        self.recoverable = recoverable


class UpstreamLLMError(ContextFlowError):
    pass


class StorageError(ContextFlowError):
    pass


class CorruptedAnalysisError(ContextFlowError):
    """Raised when partial success would write inconsistent state. Always halts the flow."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, recoverable=False, **kwargs)


T = TypeVar("T")


def wrap_upstream_errors(
    name: str,
) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Decorator: wrap an async LLM-call function. Generic exceptions are
    logged with a fresh correlation_id and re-raised as UpstreamLLMError.
    UpstreamLLMError instances raised by the wrapped function pass through
    unchanged so nested wrappers don't double-wrap.
    """

    def decorator(fn: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            correlation_id = new_correlation_id()
            try:
                return await fn(*args, **kwargs)
            except UpstreamLLMError:
                raise
            except Exception as exc:
                logger.error("%s failed [cid=%s]: %s", name, correlation_id, exc)
                raise UpstreamLLMError(
                    f"{name} failed [cid={correlation_id}]: {exc}",
                    correlation_id=correlation_id,
                    recoverable=True,
                ) from exc

        return wrapper

    return decorator


def parse_json_or_raise(raw: str, label: str) -> Any:
    """Parse JSON; on failure, raise UpstreamLLMError with the malformed
    payload attached as `.payload`."""
    correlation_id = new_correlation_id()
    try:
        return json.loads(raw)
    except Exception as exc:
        logger.error(
            "%s JSON parse failed [cid=%s]: %s payload=%r",
            label,
            correlation_id,
            exc,
            raw,
        )
        err = UpstreamLLMError(
            f"{label} JSON parse failed [cid={correlation_id}]: {exc}",
            correlation_id=correlation_id,
            recoverable=True,
        )
        err.payload = raw
        raise err from exc
