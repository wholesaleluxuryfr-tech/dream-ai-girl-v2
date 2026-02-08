"""Logging middleware for request/response tracking"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests and responses with timing"""

    async def dispatch(self, request: Request, call_next):
        # Start timer
        start_time = time.time()

        # Generate request ID
        request_id = f"{int(start_time * 1000)}"
        request.state.request_id = request_id

        # Log request
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
                "client_host": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            }
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log error
            duration = time.time() - start_time
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": int(duration * 1000),
                    "error": str(e),
                },
                exc_info=True
            )
            raise

        # Calculate duration
        duration = time.time() - start_time

        # Add custom headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration:.4f}"

        # Log response
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": int(duration * 1000),
            }
        )

        # Warn on slow requests (> 1 second)
        if duration > 1.0:
            logger.warning(
                f"Slow request detected",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": int(duration * 1000),
                }
            )

        return response
