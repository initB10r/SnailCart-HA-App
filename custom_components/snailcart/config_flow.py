"""Config flow for SnailCart."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import CannotConnect, InvalidAuth, SnailCartClient, SnailCartError
from .const import CONF_API_KEY, DEFAULT_PORT, DOMAIN, SUPPORTED_API

USER_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_HOST): str,
        vol.Required(CONF_PORT, default=DEFAULT_PORT): vol.All(int, vol.Range(min=1, max=65535)),
        vol.Required(CONF_API_KEY): str,
    }
)
REAUTH_SCHEMA = vol.Schema({vol.Required(CONF_API_KEY): str})


class SnailCartConfigFlow(ConfigFlow, domain=DOMAIN):
    """Set up the connection to the SnailCart add-on."""

    VERSION = 1

    async def _validate(self, host: str, port: int, key: str) -> str | None:
        client = SnailCartClient(async_get_clientsession(self.hass), host, port, key)
        try:
            info = await client.info()
            await client.lists()
        except InvalidAuth:
            return "invalid_auth"
        except CannotConnect:
            return "cannot_connect"
        except SnailCartError:
            return "unknown"
        if info.get("api") != SUPPORTED_API:
            return "unsupported_version"
        return None

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            host = user_input[CONF_HOST].strip()
            port = user_input[CONF_PORT]
            key = user_input[CONF_API_KEY].strip()
            await self.async_set_unique_id(f"{host}:{port}")
            self._abort_if_unique_id_configured()
            if error := await self._validate(host, port, key):
                errors["base"] = error
            else:
                return self.async_create_entry(
                    title="SnailCart",
                    data={CONF_HOST: host, CONF_PORT: port, CONF_API_KEY: key},
                )
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(USER_SCHEMA, user_input or {}),
            errors=errors,
        )

    async def async_step_reauth(self, entry_data: Mapping[str, Any]) -> ConfigFlowResult:
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        entry = self._get_reauth_entry()
        if user_input is not None:
            key = user_input[CONF_API_KEY].strip()
            if error := await self._validate(entry.data[CONF_HOST], entry.data[CONF_PORT], key):
                errors["base"] = error
            else:
                return self.async_update_reload_and_abort(entry, data_updates={CONF_API_KEY: key})
        return self.async_show_form(step_id="reauth_confirm", data_schema=REAUTH_SCHEMA, errors=errors)
