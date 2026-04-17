"""OpenAI-compatible provider implementation used in place of LiteLLM."""

import json
import re
from typing import Any

import httpx

from pyclaw.providers.base import LLMProvider, LLMResponse, ToolCallRequest


class LiteLLMProvider(LLMProvider):
    """Compatibility wrapper that talks to OpenAI-compatible chat APIs directly."""

    def __init__(
        self,
        api_key: str | None = None,
        api_base: str | None = None,
        default_model: str = "anthropic/claude-opus-4-5",
        enable_text_tool_call_fallback: bool = True,
    ):
        super().__init__(api_key, api_base)
        self.default_model = default_model
        self.enable_text_tool_call_fallback = enable_text_tool_call_fallback

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> LLMResponse:
        model = model or self.default_model
        api_base = self._resolve_api_base(model)
        payload: dict[str, Any] = {
            "model": self._normalize_model_name(model, api_base),
            "messages": messages,
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        headers = self._build_headers(api_base)

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    f"{api_base.rstrip('/')}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                return self._parse_response(response.json())
        except Exception as e:
            return LLMResponse(
                content=f"Error calling LLM: {str(e)}",
                finish_reason="error",
            )

    def _resolve_api_base(self, model: str) -> str:
        if self.api_base:
            return self.api_base

        lowered = model.lower()
        if model.startswith("openrouter/"):
            return "https://openrouter.ai/api/v1"
        if "deepseek" in lowered:
            return "https://api.deepseek.com/v1"
        if model.startswith("gpt-") or model.startswith("openai/") or "openai" in lowered:
            return "https://api.openai.com/v1"
        raise ValueError(
            "No supported API base resolved for the configured model. "
            "Please set providers.<name>.apiBase in workspace/pyclaw.json."
        )

    def _normalize_model_name(self, model: str, api_base: str) -> str:
        if "openrouter.ai" in api_base and model.startswith("openrouter/"):
            return model[len("openrouter/"):]
        if "api.deepseek.com" in api_base and model.startswith("deepseek/"):
            return model[len("deepseek/"):]
        if model.startswith("openai/"):
            return model[len("openai/"):]
        return model

    def _build_headers(self, api_base: str) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if "openrouter.ai" in api_base:
            headers["HTTP-Referer"] = "https://pyclaw.local"
            headers["X-Title"] = "pyclaw"
        return headers

    def _parse_response(self, response: dict[str, Any]) -> LLMResponse:
        choices = response.get("choices") or []
        if not choices:
            return LLMResponse(
                content="Error calling LLM: empty response choices",
                finish_reason="error",
            )

        choice = choices[0]
        message = choice.get("message") or {}
        content = message.get("content")

        tool_calls: list[ToolCallRequest] = []
        for tc in message.get("tool_calls") or []:
            function = tc.get("function") or {}
            tool_calls.append(
                ToolCallRequest(
                    id=tc.get("id", ""),
                    name=function.get("name", ""),
                    arguments=self._coerce_tool_arguments(function.get("arguments", {})),
                )
            )

        if self.enable_text_tool_call_fallback and not tool_calls:
            content, tool_calls = self._extract_text_tool_calls(content)

        usage_raw = response.get("usage") or {}
        usage = {
            "prompt_tokens": usage_raw.get("prompt_tokens", 0),
            "completion_tokens": usage_raw.get("completion_tokens", 0),
            "total_tokens": usage_raw.get("total_tokens", 0),
        }

        return LLMResponse(
            content=content,
            tool_calls=[tc for tc in tool_calls if tc.name],
            finish_reason=choice.get("finish_reason") or "stop",
            usage=usage,
        )

    def _coerce_tool_arguments(self, arguments: Any) -> dict[str, Any]:
        """Normalize tool-call arguments to a dict payload."""
        if isinstance(arguments, dict):
            return arguments

        if isinstance(arguments, str):
            try:
                parsed = json.loads(arguments)
            except json.JSONDecodeError:
                return {"raw": arguments}
            if isinstance(parsed, dict):
                return parsed
            return {"value": parsed}

        return {"value": arguments}

    def _extract_text_tool_calls(
        self,
        content: Any,
    ) -> tuple[str | None, list[ToolCallRequest]]:
        """
        Parse tool calls from text outputs like:
        <tool_call>{"name": "...", "arguments": {...}}</tool_call>
        """
        if not isinstance(content, str) or "<tool_call>" not in content:
            return content, []

        pattern = re.compile(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", re.DOTALL)
        parsed_calls: list[ToolCallRequest] = []

        for index, match in enumerate(pattern.finditer(content), start=1):
            try:
                payload = json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                continue

            if not isinstance(payload, dict):
                continue

            name = payload.get("name")
            if not isinstance(name, str) or not name.strip():
                continue

            call_id = payload.get("id")
            if not isinstance(call_id, str) or not call_id.strip():
                call_id = f"text_tool_call_{index}"

            parsed_calls.append(
                ToolCallRequest(
                    id=call_id,
                    name=name.strip(),
                    arguments=self._coerce_tool_arguments(payload.get("arguments", {})),
                )
            )

        if not parsed_calls:
            return content, []

        cleaned = pattern.sub("", content).strip()
        return (cleaned or None), parsed_calls
    
    def get_default_model(self) -> str:
        return self.default_model
