import logging
import sys
import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Structured logger setup
logger = logging.getLogger("cv_workspace")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(
    logging.Formatter(
        '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", "message": %(message)s}'
    )
)
logger.addHandler(handler)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.perf_counter()

        response = await call_next(request)

        duration = time.perf_counter() - start_time
        duration_ms = round(duration * 1000, 2)

        # Do not log request bodies or sensitive query params
        logger.info(
            f'{{"request_id": "{request_id}", "method": "{request.method}", "path": "{request.url.path}", "status": {response.status_code}, "latency_ms": {duration_ms}}}'
        )
        response.headers["X-Request-ID"] = request_id
        return response
