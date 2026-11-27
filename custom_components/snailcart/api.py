"""Small client for the SnailCart integration API (internal add-on port)."""

from __future__ import annotations

from collections.abc import AsyncIterator
import json
from typing import Any
from urllib.parse import quote

import aiohttp

from .const import API_BASE


class SnailCartError(Exception):
    """Base error."""


class CannotConnect(SnailCartError):
    """SnailCart is not reachable."""


class InvalidAuth(SnailCartError):
    """The integration key was rejected."""


class NotFound(SnailCartError):
    """List or item does not exist (or is not shared with Home Assistant)."""


class Forbidden(SnailCartError):
    """The acting user may not do this."""


class SnailCartClient:
    """Talks to SnailCart's integration listener."""

    def __init__(self, session: aiohttp.ClientSession, host: str, port: int, key: str) -> None:
        self._session = session
        self._base = f"http://{host}:{port}{API_BASE}"
        self._key = key

    def _headers(self, user_id: str | None = None, user_name: str | None = None) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self._key}"}
        if user_id:
            headers["X-SnailCart-User"] = user_id
            if user_name:
                # Header values must be ASCII; SnailCart URI-decodes this.
                headers["X-SnailCart-User-Name"] = quote(user_name[:100], safe="")
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        user_id: str | None = None,
        user_name: str | None = None,
    ) -> Any:
        try:
            async with self._session.request(
                method,
                f"{self._base}{path}",
                headers=self._headers(user_id, user_name),
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 401:
                    raise InvalidAuth
                if resp.status == 404:
                    raise NotFound
                if resp.status == 403:
                    raise Forbidden
                if resp.status >= 400:
                    raise SnailCartError(f"HTTP {resp.status}")
                return await resp.json()
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CannotConnect(str(err)) from err

    async def info(self) -> dict[str, Any]:
        return await self._request("GET", "/info")

    async def lists(self) -> list[dict[str, Any]]:
        return await self._request("GET", "/lists")

    async def list_detail(self, list_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/lists/{quote(list_id, safe='')}")

    async def delete_item(self, item_id: str, user_id: str, user_name: str | None) -> str:
        """Delete (own item / admin) or flag for deletion. Returns 'deleted' or 'requested'."""
        r = await self._request("DELETE", f"/items/{quote(item_id, safe='')}", user_id, user_name)
        return r.get("result", "")

    async def cancel_delete(self, item_id: str, user_id: str, user_name: str | None) -> None:
        await self._request(
            "DELETE", f"/items/{quote(item_id, safe='')}/delete-request", user_id, user_name
        )

    async def events(self) -> AsyncIterator[dict[str, Any]]:
        """Yield change notifications from SnailCart's event stream until it ends."""
        try:
            async with self._session.get(
                f"{self._base}/events",
                headers=self._headers(),
                # SnailCart pings every 25 s; no total timeout for a long-lived stream.
                timeout=aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=90),
            ) as resp:
                if resp.status == 401:
                    raise InvalidAuth
                if resp.status >= 400:
                    raise SnailCartError(f"HTTP {resp.status}")
                async for raw in resp.content:
                    line = raw.decode("utf-8", "replace").strip()
                    if not line.startswith("data:"):
                        continue
                    try:
                        data = json.loads(line[5:].strip())
                    except ValueError:
                        continue
                    if isinstance(data, dict):
                        yield data
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CannotConnect(str(err)) from err
