from starlette.responses import JSONResponse


class BodyLimitMiddleware:
    def __init__(self, app, limit):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > self.limit:
                return await JSONResponse(
                    {
                        "error": {
                            "code": "REQUEST_TOO_LARGE",
                            "message": "Request exceeds the configured size limit.",
                            "details": [],
                        }
                    },
                    status_code=413,
                )(scope, receive, send)
            chunks.append(message)
            if not message.get("more_body", False):
                break

        async def bounded_receive():
            if chunks:
                return chunks.pop(0)
            return await receive()

        await self.app(scope, bounded_receive, send)
