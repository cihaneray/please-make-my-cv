"""Resolve, validate and pin each model request while preserving TLS SNI and Host."""

import ipaddress
import socket

import httpx

from app.core.config import settings
from app.core.exceptions import AppException

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "host.docker.internal", "ollama"}
PUBLIC_HOSTS = {"api.openai.com", "generativelanguage.googleapis.com"}


def validate_host(host: str):
    if host.lower() not in PUBLIC_HOSTS | LOCAL_HOSTS | {
        value.lower() for value in settings.llm_allowed_hosts
    }:
        raise ValueError(
            "This model host is not allowed. Configure LLM_ALLOWED_HOSTS for a trusted custom server."
        )


class ModelTransport(httpx.BaseTransport):
    def __init__(self):
        self.inner = httpx.HTTPTransport(retries=0, trust_env=False)

    def handle_request(self, request: httpx.Request):
        host = request.url.host.lower()
        try:
            validate_host(host)
            addresses = list(
                dict.fromkeys(
                    item[4][0]
                    for item in socket.getaddrinfo(
                        host,
                        request.url.port or (443 if request.url.scheme == "https" else 80),
                        type=socket.SOCK_STREAM,
                    )
                )
            )
            if not addresses:
                raise ValueError("No address")
            for address in addresses:
                ip = ipaddress.ip_address(address)
                if (
                    ip.is_link_local
                    or ip.is_multicast
                    or ip.is_unspecified
                    or (not ip.is_global and host not in LOCAL_HOSTS)
                ):
                    raise ValueError("Restricted address")
        except (ValueError, OSError) as exc:
            raise AppException(
                "AI_HOST_REJECTED",
                "The model server address is not permitted or could not be resolved.",
                422,
            ) from exc
        # Only retry connection setup across already validated addresses. A request
        # that reached the server is never replayed here (provider billing safety).
        for index, address in enumerate(addresses):
            pinned = httpx.Request(
                request.method,
                request.url.copy_with(host=address),
                headers=request.headers,
                stream=request.stream,
                extensions={**request.extensions, "sni_hostname": host},
            )
            try:
                return self.inner.handle_request(pinned)
            except (httpx.ConnectError, httpx.ConnectTimeout):
                if index == len(addresses) - 1:
                    raise
        raise RuntimeError("No validated model addresses")

    def close(self):
        self.inner.close()
