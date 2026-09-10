from .base import *  # noqa: F403,F401

DEBUG = True

ALLOWED_HOSTS = ["*"]  # noqa: F405

CORS_ALLOW_ALL_ORIGINS = True

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BASE_DIR / "db.sqlite3"),
        "CONN_MAX_AGE": 0,
    }
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

LOGGING["handlers"]["console"]["formatter"] = "console"  # type: ignore[index] # noqa: F405