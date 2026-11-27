"""Data coordinator: mirrors the SnailCart lists shared with Home Assistant."""

from __future__ import annotations

import asyncio
from datetime import timedelta
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.debounce import Debouncer
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import CannotConnect, InvalidAuth, NotFound, SnailCartClient, SnailCartError
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Push via the event stream is the primary path; this is only a safety net.
FALLBACK_INTERVAL = timedelta(minutes=5)


class SnailCartCoordinator(DataUpdateCoordinator[dict[str, dict[str, Any]]]):
    """Holds {list_id: detail} for every list shared with Home Assistant."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, client: SnailCartClient) -> None:
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=DOMAIN,
            update_interval=FALLBACK_INTERVAL,
            # Changes arrive as pushes; coalesce bursts but react within ~1 s.
            request_refresh_debouncer=Debouncer(hass, _LOGGER, cooldown=1.0, immediate=True),
        )
        self.client = client

    async def _async_update_data(self) -> dict[str, dict[str, Any]]:
        try:
            lists = await self.client.lists()
            details = await asyncio.gather(
                *(self.client.list_detail(lst["id"]) for lst in lists), return_exceptions=True
            )
        except InvalidAuth as err:
            raise ConfigEntryAuthFailed("SnailCart hat den Schlüssel abgelehnt") from err
        except SnailCartError as err:
            raise UpdateFailed(f"SnailCart nicht erreichbar: {err}") from err

        data: dict[str, dict[str, Any]] = {}
        for lst, detail in zip(lists, details, strict=True):
            if isinstance(detail, NotFound):
                continue  # un-shared between the two calls
            if isinstance(detail, InvalidAuth):
                raise ConfigEntryAuthFailed("SnailCart hat den Schlüssel abgelehnt")
            if isinstance(detail, BaseException):
                raise UpdateFailed(f"Liste {lst['id']} nicht ladbar: {detail}")
            data[lst["id"]] = detail
        return data

    def find_item(self, item_id: str) -> tuple[str, dict[str, Any]] | None:
        """Return (list_id, item) for an item id, if it is in a shared list."""
        for list_id, detail in (self.data or {}).items():
            for item in detail.get("items", []):
                if item.get("id") == item_id:
                    return list_id, item
        return None

    async def async_run_event_stream(self) -> None:
        """Listen for change pushes forever (cancelled when the entry unloads)."""
        backoff = 5
        while True:
            try:
                connected = False
                async for _event in self.client.events():
                    if not connected:
                        connected = True
                        backoff = 5
                    await self.async_request_refresh()
                # Stream ended normally (e.g. key rotated / add-on restarted).
            except InvalidAuth:
                _LOGGER.warning("SnailCart: Schlüssel abgelehnt, bitte neu eintragen")
                if self.config_entry is not None:
                    self.config_entry.async_start_reauth(self.hass)
                return
            except CannotConnect as err:
                _LOGGER.debug("SnailCart event stream lost: %s", err)
            except SnailCartError as err:
                _LOGGER.debug("SnailCart event stream error: %s", err)
            # Catch up on anything missed while disconnected, then retry.
            await self.async_request_refresh()
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)
