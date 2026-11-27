"""SnailCart integration: shows SnailCart shopping lists in Home Assistant.

Read-only mirror of the lists that are shared with Home Assistant in SnailCart,
plus deleting items (other people's items are only flagged for deletion).
Adding and checking off items happens in SnailCart itself (app or Siri).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, Platform
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv, entity_registry as er
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .api import Forbidden, NotFound, SnailCartClient, SnailCartError
from .const import CONF_API_KEY, DOMAIN, OPEN_STATES
from .coordinator import SnailCartCoordinator

PLATFORMS = [Platform.TODO]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

# Dashboard card shipped with the integration and loaded on every HA page, so
# no Lovelace resource is needed. The version query busts the browser cache
# (wall iPads) whenever the integration is updated.
CARD_URL = "/snailcart_static/snail-cart-card.js"
CARD_FILE = Path(__file__).parent / "frontend" / "snail-cart-card.js"

type SnailCartConfigEntry = ConfigEntry[SnailCartCoordinator]

GET_LIST_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_id,
        vol.Optional("include_done", default=False): cv.boolean,
        vol.Optional("include_pending", default=False): cv.boolean,
    }
)
CANCEL_DELETE_SCHEMA = vol.Schema({vol.Required("item_id"): cv.string})


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the integration's services and the dashboard card once."""

    integration = await async_get_integration(hass, DOMAIN)
    if hass.http is not None:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(CARD_URL, str(CARD_FILE), cache_headers=True)]
        )
        add_extra_js_url(hass, f"{CARD_URL}?v={integration.version}")

    async def get_list(call: ServiceCall) -> ServiceResponse:
        entity_id: str = call.data["entity_id"]
        coordinator, list_id = _resolve_entity(hass, entity_id)
        detail = (coordinator.data or {}).get(list_id)
        if detail is None:
            raise ServiceValidationError(f"{entity_id} ist in SnailCart nicht (mehr) freigegeben")
        return _shape_list(
            hass, entity_id, detail, call.data["include_done"], call.data["include_pending"]
        )

    async def cancel_delete(call: ServiceCall) -> None:
        item_id: str = call.data["item_id"]
        user_id, user_name = await _actor(hass, call)
        for coordinator in _coordinators(hass):
            if coordinator.find_item(item_id) is None:
                continue
            try:
                await coordinator.client.cancel_delete(item_id, user_id, user_name)
            except Forbidden as err:
                raise ServiceValidationError(
                    "Nur wer vorgemerkt hat, der Ersteller oder ein Admin kann das zurücknehmen"
                ) from err
            except NotFound as err:
                raise ServiceValidationError("Artikel nicht gefunden") from err
            except SnailCartError as err:
                raise HomeAssistantError(f"SnailCart: {err}") from err
            await coordinator.async_request_refresh()
            return
        raise ServiceValidationError("Artikel nicht gefunden")

    hass.services.async_register(
        DOMAIN, "get_list", get_list, schema=GET_LIST_SCHEMA, supports_response=SupportsResponse.ONLY
    )
    hass.services.async_register(DOMAIN, "cancel_delete", cancel_delete, schema=CANCEL_DELETE_SCHEMA)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: SnailCartConfigEntry) -> bool:
    client = SnailCartClient(
        async_get_clientsession(hass),
        entry.data[CONF_HOST],
        entry.data[CONF_PORT],
        entry.data[CONF_API_KEY],
    )
    coordinator = SnailCartCoordinator(hass, entry, client)
    await coordinator.async_update_versions()
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_create_background_task(
        hass, coordinator.async_run_event_stream(), "snailcart_event_stream"
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: SnailCartConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


# --------------------------------------------------------------------------- helpers


def _coordinators(hass: HomeAssistant) -> list[SnailCartCoordinator]:
    return [
        entry.runtime_data
        for entry in hass.config_entries.async_loaded_entries(DOMAIN)
        if isinstance(getattr(entry, "runtime_data", None), SnailCartCoordinator)
    ]


def _resolve_entity(hass: HomeAssistant, entity_id: str) -> tuple[SnailCartCoordinator, str]:
    """Map a todo entity of this integration to (coordinator, SnailCart list id)."""
    reg_entry = er.async_get(hass).async_get(entity_id)
    if reg_entry is None or reg_entry.platform != DOMAIN or not reg_entry.config_entry_id:
        raise ServiceValidationError(f"{entity_id} ist keine SnailCart-Liste")
    entry = hass.config_entries.async_get_entry(reg_entry.config_entry_id)
    coordinator = getattr(entry, "runtime_data", None) if entry else None
    if not isinstance(coordinator, SnailCartCoordinator):
        raise ServiceValidationError("SnailCart ist nicht geladen")
    prefix = f"{reg_entry.config_entry_id}_"
    if not reg_entry.unique_id.startswith(prefix):
        raise ServiceValidationError(f"{entity_id} ist keine SnailCart-Liste")
    return coordinator, reg_entry.unique_id[len(prefix):]


async def _actor(hass: HomeAssistant, call: ServiceCall) -> tuple[str, str | None]:
    """The logged-in HA user behind a service call (required for changes)."""
    user_id = call.context.user_id
    if not user_id:
        raise ServiceValidationError(
            "Änderungen an SnailCart brauchen einen angemeldeten Home-Assistant-Benutzer"
        )
    user = await hass.auth.async_get_user(user_id)
    return user_id, (user.name if user else None)


def _person_map(hass: HomeAssistant) -> dict[str, str]:
    """HA user id -> person.* entity id."""
    out: dict[str, str] = {}
    for state in hass.states.async_all("person"):
        uid = state.attributes.get("user_id")
        if uid:
            out[uid] = state.entity_id
    return out


def _who(ref: dict[str, Any] | None, persons: dict[str, str]) -> dict[str, Any] | None:
    if not ref:
        return None
    return {"name": ref.get("name") or "", "person": persons.get(ref.get("uid") or "")}


def _shape_list(
    hass: HomeAssistant,
    entity_id: str,
    detail: dict[str, Any],
    include_done: bool,
    include_pending: bool,
) -> dict[str, Any]:
    """Build the documented get_list response (see docs/ha-integration-antwort.md)."""
    persons = _person_map(hass)
    items = []
    for item in detail.get("items", []):
        if not include_done and item.get("state") not in OPEN_STATES:
            continue
        pending = item.get("delete_requested")
        if pending and not include_pending:
            continue
        items.append(
            {
                "id": item.get("id"),
                "name": item.get("name", ""),
                "brand": item.get("brand", ""),
                "quantity": item.get("quantity", 1),
                "unit": item.get("unit", ""),
                "category": item.get("category"),
                "state": item.get("state"),
                "image": item.get("image"),
                "notes": item.get("notes", ""),
                "added_by": _who(item.get("added_by"), persons),
                "added_at": item.get("added_at"),
                "delete_requested": (
                    {"by": _who(pending.get("by"), persons), "at": pending.get("at")}
                    if pending
                    else None
                ),
            }
        )
    lst = detail.get("list", {})
    return {
        "list": {"id": lst.get("id"), "name": lst.get("name"), "entity_id": entity_id},
        "categories": detail.get("categories", []),
        "items": items,
    }
