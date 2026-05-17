"""Domain exceptions mapped to HTTP responses by a single handler.

Services raise these; they never import FastAPI. Keeps the business layer
transport-agnostic and testable.
"""


class AppError(Exception):
    status_code = 400

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class AuthError(AppError):
    status_code = 401


class ForbiddenError(AppError):
    status_code = 403
