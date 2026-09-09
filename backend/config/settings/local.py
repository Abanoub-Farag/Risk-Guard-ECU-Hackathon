from .base import *  # noqa: F403
from .base import env

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

LOGGING["handlers"]["console"]["formatter"] = "console"  # type: ignore[index] # noqa: F405
