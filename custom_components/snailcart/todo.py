"""Todo entities: one per SnailCart list shared with Home Assistant."""

from __future__ import annotations

from typing import Any

from homeassistant.components.todo import (
    TodoItem,
    TodoItemStatus,
    TodoListEntity,
    TodoListEntityFeature,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import SnailCartConfigEntry
from .api import NotFound, SnailCartError
from .const import DOMAIN, OPEN_STATES
from .coordinator import SnailCartCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: SnailCartConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    known: set[str] = set()

    @callback
    def _sync() -> None:
        current = set(coordinator.data or {})
        new = current - known
        if new:
            known.update(new)
            async_add_entities(SnailCartTodoList(coordinator, entry, lid) for lid in new)
        # Lists no longer shared with HA disappear completely.
        gone = known - current
        if gone:
            registry = er.async_get(hass)
            for lid in gone:
                entity_id = registry.async_get_entity_id("todo", DOMAIN, f"{entry.entry_id}_{lid}")
                if entity_id:
                    registry.async_remove(entity_id)
                known.discard(lid)

    _sync()
    entry.async_on_unload(coordinator.async_add_listener(_sync))


def _fmt_qty(q: Any) -> str:
    try:
        f = float(q)
    except (TypeError, ValueError):
        return str(q or "")
    return str(int(f)) if f.is_integer() else str(f).replace(".", ",")


class SnailCartTodoList(CoordinatorEntity[SnailCartCoordinator], TodoListEntity):
    """A SnailCart shopping list. Only deleting is supported from Home Assistant."""

    _attr_icon = "mdi:cart"
    _attr_supported_features = TodoListEntityFeature.DELETE_TODO_ITEM

    def __init__(self, coordinator: SnailCartCoordinator, entry: SnailCartConfigEntry, list_id: str) -> None:
        super().__init__(coordinator)
        self._list_id = list_id
        self._attr_unique_id = f"{entry.entry_id}_{list_id}"
        self._attr_device_info = coordinator.device_info

    @property
    def _detail(self) -> dict[str, Any] | None:
        return (self.coordinator.data or {}).get(self._list_id)

    @property
    def available(self) -> bool:
        return super().available and self._detail is not None

    @property
    def name(self) -> str:
        detail = self._detail
        return (detail or {}).get("list", {}).get("name") or "SnailCart"

    @property
    def todo_items(self) -> list[TodoItem] | None:
        detail = self._detail
        if detail is None:
            return None
        items: list[TodoItem] = []
        for item in detail.get("items", []):
            if item.get("delete_requested"):
                continue  # flagged for deletion -> hidden in HA
            qty = " ".join(p for p in (_fmt_qty(item.get("quantity")), item.get("unit") or "") if p)
            description = " · ".join(p for p in (qty, item.get("category") or "") if p)
            items.append(
                TodoItem(
                    uid=item["id"],
                    summary=item.get("name", ""),
                    status=(
                        TodoItemStatus.NEEDS_ACTION
                        if item.get("state") in OPEN_STATES
                        else TodoItemStatus.COMPLETED
                    ),
                    description=description or None,
                )
            )
        return items

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        """Delete own items; other people's items are only flagged in SnailCart."""
        user_id = self._context.user_id if self._context else None
        if not user_id:
            raise HomeAssistantError(
                "Löschen in SnailCart braucht einen angemeldeten Home-Assistant-Benutzer"
            )
        user = await self.hass.auth.async_get_user(user_id)
        user_name = user.name if user else None
        try:
            for uid in uids:
                try:
                    await self.coordinator.client.delete_item(uid, user_id, user_name)
                except NotFound:
                    continue  # already gone — fine
        except SnailCartError as err:
            raise HomeAssistantError(f"SnailCart: {err}") from err
        finally:
            await self.coordinator.async_request_refresh()
