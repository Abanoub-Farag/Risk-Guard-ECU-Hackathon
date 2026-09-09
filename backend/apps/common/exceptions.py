from rest_framework import status


class ApplicationError(Exception):
    """Base domain application exception for business logic violations."""
    def __init__(
        self,
        message: str,
        code: str = "application_error",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
