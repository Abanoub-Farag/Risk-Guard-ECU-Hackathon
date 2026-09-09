# syntax=docker/dockerfile:1.7
# Stage 1: Build stage with uv
FROM python:3.12-slim-bookworm AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv binary directly from official image
COPY --from=ghcr.io/astral-sh/uv:0.4.15 /uv /bin/uv

# Copy dependency specifications
COPY pyproject.toml .

# Install dependencies into virtual environment
RUN uv venv /opt/venv && \
    uv pip compile pyproject.toml -o /tmp/requirements.txt && \
    VIRTUAL_ENV=/opt/venv uv pip install --no-cache -r /tmp/requirements.txt

# Stage 2: Minimal production runtime stage
FROM python:3.12-slim-bookworm AS runner

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user and group
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup --no-create-home appuser

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application source code
COPY --chown=appuser:appgroup . /app

# Ensure directories exist for static and media files with proper permissions
RUN mkdir -p /app/staticfiles /app/mediafiles && \
    chown -R appuser:appgroup /app/staticfiles /app/mediafiles

USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/schema/ || exit 1

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "--worker-class", "gthread", "--access-logfile", "-", "--error-logfile", "-"]
