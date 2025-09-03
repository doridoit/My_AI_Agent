from __future__ import annotations

from typing import Any, Optional, Dict

try:
    from modules.mcp.client.client import call as _mcp_call
except Exception:  # pragma: no cover
    _mcp_call = None


def is_available() -> bool:
    return _mcp_call is not None


def call(tool_fqn: str, args: Dict[str, Any], timeout: int = 60) -> Any:
    if _mcp_call is None:
        raise RuntimeError("MCP client is not available. Check requirements and imports.")
    return _mcp_call(tool_fqn, args, timeout=timeout)

