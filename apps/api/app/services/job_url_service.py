"""Public HTTP(S) job previews with DNS pinning and bounded, inert HTML parsing."""

import ipaddress
import json
import socket
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from html.parser import HTMLParser
from threading import BoundedSemaphore
from urllib.parse import urljoin, urlsplit

import httpx
from pydantic import BaseModel, Field

from app.core.exceptions import AppException

MAX_BYTES = 1024 * 1024
DEADLINE_SECONDS = 15
_resolver = ThreadPoolExecutor(max_workers=2, thread_name_prefix="job-dns")
_dns_slots = BoundedSemaphore(2)


class JobUrlRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


def rejected(message="Use a publicly accessible HTTP or HTTPS job URL."):
    return AppException("JOB_URL_REJECTED", message, 422)


def validate_url(url):
    try:
        parsed = urlsplit(url)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.port not in {None, 80, 443}
            or any(ord(c) < 33 or ord(c) == 127 for c in url)
            or "\\" in url
        ):
            raise ValueError()
        host = parsed.hostname.rstrip(".").lower()
        if host in {"localhost", "metadata.google.internal"} or host.endswith(
            (".localhost", ".local", ".internal")
        ):
            raise ValueError()
        return parsed, host
    except ValueError as exc:
        raise rejected() from exc


def public_addresses(host, port, remaining):
    if not _dns_slots.acquire(blocking=False):
        raise rejected("Job URL lookups are busy. Try again shortly.")
    future = _resolver.submit(socket.getaddrinfo, host, port, 0, socket.SOCK_STREAM)
    future.add_done_callback(lambda _: _dns_slots.release())
    try:
        answers = future.result(timeout=max(0.01, min(3, remaining)))
        addresses = list(dict.fromkeys(answer[4][0] for answer in answers))
        if not addresses or any(
            not ipaddress.ip_address(address).is_global
            or ipaddress.ip_address(address).is_multicast
            or getattr(ipaddress.ip_address(address), "ipv4_mapped", None) is not None
            or getattr(ipaddress.ip_address(address), "sixtofour", None) is not None
            or getattr(ipaddress.ip_address(address), "teredo", None) is not None
            for address in addresses
        ):
            raise ValueError()
        return addresses
    except (ValueError, OSError, TimeoutError) as exc:
        raise rejected("The job host could not be resolved to public addresses.") from exc


class PublicJobTransport(httpx.BaseTransport):
    def __init__(self, deadline):
        self.deadline = deadline
        self.inner = httpx.HTTPTransport(retries=0, trust_env=False)

    def handle_request(self, request):
        _, host = validate_url(str(request.url))
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise rejected("The job page took too long to respond.")
        addresses = public_addresses(
            host, request.url.port or (443 if request.url.scheme == "https" else 80), remaining
        )
        timeout = min(4, self.deadline - time.monotonic())
        if timeout <= 0:
            raise rejected("The job page took too long to respond.")
        pinned = httpx.Request(
            "GET",
            request.url.copy_with(host=addresses[0]),
            headers=request.headers,
            extensions={
                "sni_hostname": host,
                "timeout": {name: timeout for name in ("connect", "read", "write", "pool")},
            },
        )
        return self.inner.handle_request(pinned)

    def close(self):
        self.inner.close()


class JobHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = []
        self.json_buffer = None
        self.json_blocks = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style", "noscript", "template"}:
            self.hidden.append(tag)
            if (
                tag == "script"
                and attrs.get("type", "").lower() == "application/ld+json"
                and len(self.json_blocks) < 30
            ):
                self.json_buffer = []
        elif tag in {"p", "br", "li", "div", "h1", "h2", "h3"} and not self.hidden:
            self.text.append("\n")

    def handle_endtag(self, tag):
        if self.hidden and tag == self.hidden[-1]:
            self.hidden.pop()
            if tag == "script" and self.json_buffer is not None:
                self.json_blocks.append("".join(self.json_buffer))
                self.json_buffer = None

    def handle_data(self, data):
        if self.json_buffer is not None:
            self.json_buffer.append(data)
        elif not self.hidden:
            self.text.append(data)

    def visible(self):
        return "\n".join(
            " ".join(line.split()) for line in "".join(self.text).splitlines() if line.strip()
        )[:20000]


def plain_text(value):
    parser = JobHTML()
    parser.feed(value[:MAX_BYTES])
    return parser.visible()


def extract_job(html, source_url):
    parser = JobHTML()
    parser.feed(html)
    candidates = []
    for block in parser.json_blocks:
        try:
            pending = [json.loads(block)]
            visited = 0
            while pending and visited < 2000:
                value = pending.pop()
                visited += 1
                if isinstance(value, dict):
                    kind = value.get("@type")
                    if kind == "JobPosting" or isinstance(kind, list) and "JobPosting" in kind:
                        candidates.append(value)
                    pending.extend(value.values())
                elif isinstance(value, list):
                    pending.extend(value)
        except (ValueError, RecursionError):
            continue
    if len(candidates) == 1:
        job = candidates[0]
        organization = job.get("hiringOrganization")
        company = organization.get("name", "") if isinstance(organization, dict) else ""
        title, description = job.get("title"), job.get("description")
        if isinstance(title, str) and isinstance(description, str) and description.strip():
            return {
                "sourceUrl": source_url,
                "company": plain_text(company)[:255] if isinstance(company, str) else "",
                "position": plain_text(title)[:255],
                "description": plain_text(description),
                "extraction": "structured",
                "warnings": ["Review the imported fields before adding the job."],
            }
    text = parser.visible()
    if not text:
        raise rejected("No readable job text was found. Paste the job description manually.")
    return {
        "sourceUrl": source_url,
        "company": "",
        "position": "",
        "description": text,
        "extraction": "text",
        "warnings": [
            "No single structured job posting was found. Fill in the company and position, and edit the page text before adding the job."
        ],
    }


def import_job_url(url):
    validate_url(url)
    deadline = time.monotonic() + DEADLINE_SECONDS
    current = url
    try:
        with httpx.Client(
            transport=PublicJobTransport(deadline),
            trust_env=False,
            follow_redirects=False,
            timeout=4,
        ) as client:
            for hop in range(4):
                validate_url(current)
                client.cookies.clear()
                with client.stream(
                    "GET",
                    current,
                    headers={
                        "Accept": "text/html, application/xhtml+xml",
                        "Accept-Encoding": "identity",
                        "User-Agent": "CV-Job-Preview/1.0",
                    },
                ) as response:
                    if response.status_code in {301, 302, 303, 307, 308}:
                        location = response.headers.get("location")
                        if not location or hop == 3:
                            raise rejected("The job page redirected too many times.")
                        current = urljoin(current, location)
                        continue
                    if response.status_code != 200:
                        raise rejected("The job page could not be read. Paste its text manually.")
                    if response.headers.get("content-encoding", "identity").lower() not in {
                        "",
                        "identity",
                    }:
                        raise rejected(
                            "Compressed job pages are not supported. Paste its text manually."
                        )
                    content_type = (
                        response.headers.get("content-type", "").split(";")[0].strip().lower()
                    )
                    if content_type not in {"text/html", "application/xhtml+xml", "text/plain"}:
                        raise rejected("The URL must return an HTML or text job page.")
                    chunks, size = [], 0
                    for chunk in response.iter_raw():
                        size += len(chunk)
                        if size > MAX_BYTES or time.monotonic() > deadline:
                            raise rejected("The job page exceeds the size or time limit.")
                        chunks.append(chunk)
                    return extract_job(b"".join(chunks).decode("utf-8", errors="replace"), current)
    except httpx.HTTPError as exc:
        raise rejected("The job page could not be fetched. Paste its text manually.") from exc
    raise rejected()
