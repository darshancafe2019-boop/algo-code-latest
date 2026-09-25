"""
Quant.OS Universal Safe JSON Serialization Utilities
===================================================
Provides deterministic, safe JSON serialization that converts bytes, bytearrays,
memoryviews, UUIDs, decimals, datetimes, numpy types, and dataclasses to valid JSON primitives.
Zero use of default=str hacks; performs typed conversions with UTF-8 decoding / typed base64 representations.
"""

from __future__ import annotations

import base64
import datetime
import json
import math
import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union


def sanitize_for_json(val: Any) -> Any:
    """
    Recursively sanitizes values into standard JSON-compliant primitives.
    
    Type conversion rules:
    - bytes / bytearray / memoryview: decodes UTF-8 string; if binary, encodes as base64 string.
    - datetime / date: converts to ISO-8601 string.
    - UUID: converts to standard string.
    - Decimal: converts to float.
    - float: maps NaN / Inf to None.
    - numpy scalars / arrays: converts to Python float/int/list.
    - dataclasses / objects with to_dict(): recursively converts dictionaries.
    """
    if val is None:
        return None

    if isinstance(val, (str, int, bool)):
        return val

    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        return val

    if isinstance(val, (bytes, bytearray, memoryview)):
        b = bytes(val)
        try:
            return b.decode("utf-8")
        except UnicodeDecodeError:
            return base64.b64encode(b).decode("ascii")

    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.isoformat()

    if isinstance(val, uuid.UUID):
        return str(val)

    if isinstance(val, Decimal):
        return float(val)

    if isinstance(val, dict):
        return {str(k): sanitize_for_json(v) for k, v in val.items()}

    if isinstance(val, (list, tuple, set, frozenset)):
        return [sanitize_for_json(item) for item in val]

    if hasattr(val, "to_dict") and callable(getattr(val, "to_dict")):
        try:
            return sanitize_for_json(val.to_dict())
        except Exception:
            pass

    if hasattr(val, "__dataclass_fields__"):
        from dataclasses import asdict
        return sanitize_for_json(asdict(val))

    if hasattr(val, "item") and callable(getattr(val, "item")):
        try:
            return sanitize_for_json(val.item())
        except Exception:
            pass

    if hasattr(val, "tolist") and callable(getattr(val, "tolist")):
        try:
            return sanitize_for_json(val.tolist())
        except Exception:
            pass

    return str(val)


class SafeJSONEncoder(json.JSONEncoder):
    """Custom JSONEncoder that safely serializes any Python object."""

    def default(self, obj: Any) -> Any:
        try:
            return sanitize_for_json(obj)
        except Exception:
            return super().default(obj)


def safe_json_dumps(obj: Any, **kwargs: Any) -> str:
    """Serializes obj to JSON string safely without bytes errors."""
    sanitized = sanitize_for_json(obj)
    return json.dumps(sanitized, **kwargs)


def safe_json_loads(s: Union[str, bytes, memoryview], **kwargs: Any) -> Any:
    """Safely loads JSON from string or bytes, supporting control characters and malformed representations."""
    if isinstance(s, (bytes, bytearray, memoryview)):
        s = bytes(s).decode("utf-8", errors="replace")
    if not s or not isinstance(s, str):
        return {}
    s_clean = s.strip()
    if not s_clean:
        return {}
    kwargs.setdefault("strict", False)
    try:
        return json.loads(s_clean, **kwargs)
    except Exception:
        try:
            import ast
            parsed = ast.literal_eval(s_clean)
            if isinstance(parsed, (dict, list)):
                return parsed
        except Exception:
            pass
        raise

