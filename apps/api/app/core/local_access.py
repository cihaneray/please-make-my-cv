from secrets import compare_digest

from starlette.responses import JSONResponse

from app.core.config import settings


class LocalOriginMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (
            scope["type"] == "http"
            and scope["path"] != "/api/health"
            and scope["method"] != "OPTIONS"
        ):
            token = settings.api_token.get_secret_value()
            authorization = (
                dict(scope.get("headers", [])).get(b"authorization", b"").decode("latin1")
            )
            if token and not compare_digest(authorization, "Bearer " + token):
                return await JSONResponse(
                    {
                        "error": {
                            "code": "AUTH_REQUIRED",
                            "message": "A valid API token is required.",
                            "details": [],
                        }
                    },
                    status_code=401,
                )(scope, receive, send)
        if scope["type"] == "http" and scope["method"] not in {"GET", "HEAD", "OPTIONS"}:
            headers = dict(scope.get("headers", []))
            origin = headers.get(b"origin", b"").decode("latin1")
            if origin and origin not in settings.cors_origins:
                return await JSONResponse(
                    {
                        "error": {
                            "code": "ORIGIN_REJECTED",
                            "message": "This origin is not allowed.",
                            "details": [],
                        }
                    },
                    status_code=403,
                )(scope, receive, send)
        return await self.app(scope, receive, send)
