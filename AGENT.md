# AGENT.md: Tech Stack & Architecture Blueprint

## 1. System Overview

- **Project Purpose**: Production-ready Clean-Architecture REST API service providing chronic patient registration, baseline biometric anchoring, prescription tracking, monthly refill intake with device screen capture ingestion, OCR metric extraction and automated triage engine routing, human clinician exception adjudication dashboard, digital e-prescription voucher issuance and POS dispensing redemption, asynchronous task queuing, and strict OpenAPI-documented endpoints.
- **Architectural Style**: Modular Monolith adhering to the Service-Selector Pattern (Clean Architecture for Django/DRF), featuring decoupled domain services, read-only query selectors, and isolated API transport layers.
- **Runtime Environment**: Linux OS baseline (`python:3.12-slim-bookworm`), containerized via Docker BuildKit (syntax 1.7) and Docker Compose v2, targeting container orchestration or cloud VM runtimes.

---

## 2. Core Stack Matrix

| Layer                       | Technology                       | Exact Version                                                                                                     | Primary Purpose                                                            | Key Packages / Libraries                                              |
| :-------------------------- | :------------------------------- | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Backend Framework**       | Django / DRF                     | `django>=5.1,<5.2`, `djangorestframework>=3.15.2`                                                                 | Core web framework, routing, and HTTP API handling                         | `django`, `rest_framework`                                            |
| **Runtime & Packaging**     | Python & uv                      | Python `>=3.12`, `uv==0.4.15`                                                                                     | Language runtime, fast virtualenv management, and dependency compilation   | `python:3.12-slim-bookworm`, `ghcr.io/astral-sh/uv:0.4.15`            |
| **Primary Database**        | PostgreSQL                       | `postgres:16-alpine`                                                                                              | Persistent relational storage with JSON and transactional integrity        | `psycopg[binary,pool]>=3.2.1`                                         |
| **Caching & In-Memory**     | Redis                            | `redis:7-alpine`                                                                                                  | Application caching, throttling storage, and session broker                | `django-redis>=5.4.0`, `redis>=5.0.8`                                 |
| **Migrations & ORM**        | Django ORM                       | Built-in (`django.db.models`)                                                                                     | Data modeling, schema versioning, and persistent pooled connections        | `django.db.migrations`, `CONN_MAX_AGE=600`, `CONN_HEALTH_CHECKS=True` |
| **Validation & DTOs**       | DRF Serializers & django-environ | `djangorestframework>=3.15.2`, `django-environ>=0.11.2`                                                           | Request payload validation, data transfer objects, and environment parsing | `serializers.Serializer`, `environ.Env`                               |
| **Auth & Security**         | SimpleJWT & CORS Headers         | `djangorestframework-simplejwt>=5.3.1`, `django-cors-headers>=4.4.0`                                              | Stateless JWT authentication, token blacklisting, and CORS origin policy   | `rest_framework_simplejwt.token_blacklist`, `corsheaders`             |
| **API Documentation**       | drf-spectacular                  | `drf-spectacular>=0.27.2`                                                                                         | OpenAPI 3.0 schema generation, Swagger UI, and Redoc                       | `drf_spectacular.views.SpectacularAPIView`                            |
| **Observability & Tracing** | django-guid & structlog          | `django-guid>=3.4.1`, `structlog>=24.4.0`                                                                         | End-to-end request Correlation-ID propagation and structured JSON logging  | `django_guid.middleware.guid_middleware`, `CorrelationIdFilter`       |
| **Application Server**      | Gunicorn & Uvicorn               | `gunicorn>=23.0.0`, `uvicorn>=0.30.6`                                                                             | Production WSGI/ASGI application HTTP server with thread workers           | `gthread` worker engine                                               |
| **Testing & QA**            | Pytest, FactoryBoy, Mypy, Ruff   | `pytest>=8.3.2`, `pytest-django>=4.9.0`, `pytest-cov>=5.0.0`, `factory-boy>=3.3.1`, `mypy>=1.11.2`, `ruff>=0.6.4` | Unit/integration testing, test fixtures, static type checking, and linting | `django-stubs>=5.0.4`, `djangorestframework-stubs>=3.15.1`            |
| **Frontend**                | Uninitialized                    | N/A                                                                                                               | Placeholder client directory (`frontend/` currently empty)                 | N/A                                                                   |

---

## 3. Backend Architecture & Runtime Standards

### Framework & Language

- **Runtime**: Python `>=3.12` running on Debian Bookworm (`python:3.12-slim-bookworm`).
- **Framework Core**: Django 5.1 with Django REST Framework 3.15.
- **Type Checking**: Strict type checking via `mypy` (`strict = true`, `python_version = "3.12"`) leveraging `mypy_django_plugin` and `mypy_drf_plugin`.
- **Code Standards**: `ruff` enforcing Python 3.12 target idioms, 100-character line length, and automated import sorting.

### Data Access & Storage

- **ORM & Base Entities**: All domain entities inherit from `BaseModel` (`apps.common.models.BaseModel`):
  - Primary key: UUIDv4 (`models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`).
  - Auditing: Indexed `created_at` (`DateTimeField(auto_now_add=True)`) and `updated_at` (`DateTimeField(auto_now=True)`).
  - Soft Deletion: `is_deleted` (`BooleanField(default=False, db_index=True)`) and `deleted_at` timestamp.
  - Managers: `objects = SoftDeleteManager()` filtering alive records by default, and `all_objects = AllObjectsManager()` for raw/administrative access.
- **Database Driver**: Psycopg 3 (`psycopg[binary,pool]>=3.2.1`) using PostgreSQL engine `django.db.backends.postgresql`.
- **Connection Pooling**: Persistent TCP database connections configured with `CONN_MAX_AGE=600` and `CONN_HEALTH_CHECKS=True`.
- **Transaction Boundaries**: Explicit transactional demarcation using `@transaction.atomic` within service functions (`apps.<module>.services`).
- **Query Optimization**: Strict prohibition of N+1 queries. All queries encapsulated in `selectors.py` must declare explicit `.select_related()` for single-valued relationships and `.prefetch_related()` for multi-valued relations.

### Authentication & Authorization

- **Token Format**: HMAC-SHA256 (`HS256`) JSON Web Tokens via `rest_framework_simplejwt`.
- **Token Lifecycle**:
  - Access Token: 15-minute TTL (`JWT_ACCESS_MINUTES=15`).
  - Refresh Token: 7-day TTL (`JWT_REFRESH_DAYS=7`).
  - Token Rotation: `ROTATE_REFRESH_TOKENS=True` with database-backed token blacklisting (`BLACKLIST_AFTER_ROTATION=True`).
- **Headers**: Bearer token schema (`Authorization: Bearer <token>`).
- **RBAC & ABAC**:
  - Global Default: `rest_framework.permissions.IsAuthenticated`.
  - Object Permissions: Attribute-Based Access Control enforced via `IsOwnerOrStaff` (`apps.common.api.permissions.IsOwnerOrStaff`), permitting object access strictly to the owner (`obj.user == request.user`) or administrators (`request.user.is_staff`).

### Distributed State & Caching

- **Cache Engine**: Redis 7 accessed via `django-redis` (`django_redis.cache.RedisCache`) connecting to `REDIS_URL` (`redis://<host>:6379/0`), prefixed with `enterprise_drf:`.
- **Background Tasks**: Celery 5.4 distributed workers using Redis DB 1 (`redis://<host>:6379/1`) as broker and Redis DB 0 as result backend.
- **Rate Limiting / Throttling**:
  - Anonymous users: 100 requests/hour (`THROTTLE_ANON_RATE`).
  - Authenticated users: 1000 requests/hour (`THROTTLE_USER_RATE`).
  - Scoped endpoints (e.g., `patients`, `refills`): 300 requests/hour (`THROTTLE_PATIENTS_RATE`, `THROTTLE_REFILLS_RATE`).
- **Testing Cache & Broker**: In-memory `LocMemCache` and eager execution (`CELERY_TASK_ALWAYS_EAGER=True`) using SQLite in-memory database (`:memory:`).

---

## 4. Frontend & Client Architecture

- **Status**: The `frontend/` directory is currently a placeholder without an initialized framework or build pipeline.
- **CORS Preconfiguration**: Backend CORS middleware is preconfigured via `django-cors-headers` to accept client connections from `http://127.0.0.1:3000` and `http://localhost:3000` (`CORS_ALLOW_CREDENTIALS=True`).
- **API Surface**: Client integrations must target OpenAPI 3.0 schema endpoints exposed at `/api/schema/`, `/api/docs/` (Swagger), and `/api/redoc/`.

---

## 5. Coding Conventions & Guardrails

### Design Patterns (Service-Selector Architecture)

Every Django app under `backend/apps/<domain>/` must strictly enforce structural boundary separation:

1. **`models.py` (Domain Entities)**:
   - Define database tables, fields, constraints, indexes, and entity-specific methods only.
   - Must extend `BaseModel` for UUIDs and soft delete.
   - Zero business workflows or external side effects inside `save()` or model methods.
2. **`selectors.py` (Data Retrieval Layer)**:
   - Pure, idempotent read functions (e.g., `patient_get_by_id`, `patient_get_by_national_id`, `prescription_list_for_patient`).
   - Responsible for all filtering, ordering, slicing, and query optimization (`select_related`, `prefetch_related`).
   - Must return models, QuerySets, or primitive types. Must NEVER mutate state or trigger database writes.
3. **`services.py` (Business Logic & Mutation Layer)**:
   - Command functions executing business logic (e.g., `patient_create`, `prescription_create`, `prescription_deactivate`, `prescription_dispense`).
   - Decorated with `@transaction.atomic`.
   - Responsible for cross-model transactions, external API integrations, Celery task dispatching, and invariant checks.
   - Violations of business invariants must raise `ApplicationError` (`apps.common.exceptions.ApplicationError`).
4. **`api/serializers.py` (Data Transfer Objects)**:
   - **Input Serializers**: Extend `serializers.Serializer`. Strictly validate request bodies and query parameters. NEVER implement `.create()` or `.update()` on input serializers.
   - **Output Serializers**: Extend `serializers.ModelSerializer` (or `Serializer`). Must define `read_only_fields = fields` to prevent accidental assignment.
5. **`api/views.py` (HTTP Transport Layer)**:
   - Class-based views extending `rest_framework.views.APIView`.
   - Responsible strictly for HTTP protocol concerns: extracting params, checking authentication/permissions, executing input serializer validation, invoking appropriate service or selector, and returning output serializer responses.
   - Must include `drf-spectacular` `@extend_schema` decorators on all HTTP verb methods.

### Strict Anti-Patterns

- ❌ **No Fat Models or Fat Views**: Never place business rules or side effects in `views.py` or `models.py`.
- ❌ **No Writes in Selectors**: Selectors must never call `.save()`, `.create()`, `.update()`, or `.delete()`.
- ❌ **No Direct Model Mutations in Serializers**: Never invoke ORM persistence inside serializer `save()`, `create()`, or `update()` methods; delegate to `services.py`.
- ❌ **No N+1 Queries**: Never return raw QuerySets to serializers without eager loading related fields (`select_related` / `prefetch_related`).
- ❌ **No Auto-Increment Integer Primary Keys**: All application entities must inherit `BaseModel` with UUIDv4 IDs.
- ❌ **No Raw SQL**: Never execute raw unparameterized SQL statements outside reviewed migrations or verified selector querysets.
- ❌ **No Wildcard Production Hosts**: Never configure `ALLOWED_HOSTS = ["*"]` in production settings (fails with runtime exception in `production.py`).
- ❌ **No Hardcoded Secrets**: Secrets, keys, and credentials must strictly be loaded from environment variables via `django-environ`.

### Error Handling & API Contracts

- **RFC 7807 Problem Details**: Handled uniformly across all exceptions via `apps.common.api.exceptions.custom_exception_handler`.
- **Domain Exceptions**: Derived from `apps.common.exceptions.ApplicationError`:
  ```python
  raise ApplicationError(
      message="A patient with this National ID already exists.",
      code="patient_national_id_conflict",
      status_code=status.HTTP_409_CONFLICT,
  )
  ```
- **Error Response Envelope**:
  ```json
  {
    "type": "urn:problem-type:<error_code>",
    "title": "<error_title>",
    "status": 400,
    "detail": "<error_description>",
    "instance": "/api/v1/patients/",
    "code": "<error_code>",
    "errors": {
      "field_name": ["Specific validation error"]
    }
  }
  ```
- **Request Tracing**: `django-guid` validates and injects a `Correlation-ID` header on all incoming requests, propagating the correlation token through all structured logs and outbound responses.
- **Pagination Format**: `StandardLimitOffsetPagination` (`apps.common.api.pagination.StandardLimitOffsetPagination`):
  - Default limit: 20, Max limit: 100.
  - Response structure: `{ "count": int, "next": str|null, "previous": str|null, "limit": int, "offset": int, "results": list }`.

---

## 6. Development & Tooling Commands

### Environment Initialization

```bash
# Clone and enter directory
cd /home/abanoub/Projects/Competetion/Risk-Guard-ECU-Hackathon

# Copy environment template
cp backend/.env.example backend/.env

# Start backing services (PostgreSQL 16 & Redis 7) via Docker
docker compose -f backend/docker-compose.yml up -d postgres redis
```

### Dependency Installation

```bash
cd backend

# Using uv (recommended)
uv venv /opt/venv || uv venv .venv
source .venv/bin/activate
uv pip install -e ".[dev]"

# Or direct pip install
pip install -e ".[dev]"
```

### Database Migrations

```bash
# Run local migrations
python backend/manage.py migrate --settings=config.settings.local

# Generate new migrations after model changes
python backend/manage.py makemigrations --settings=config.settings.local

# Docker Compose execution
docker compose -f backend/docker-compose.yml run --rm web python manage.py migrate
```

### Starting Development Servers

```bash
# Run Django backend server (local settings)
python backend/manage.py runserver 0.0.0.0:8000 --settings=config.settings.local

# Run Celery background worker
cd backend && celery -A config worker --loglevel=info

# Full Docker Compose development stack
docker compose -f backend/docker-compose.yml up --build
```

### Testing, Quality Assurance & Linting

```bash
cd backend

# Run test suite with pytest and code coverage (enforces >=85% threshold)
pytest apps --cov=apps --cov-report=term-missing --cov-fail-under=85

# Static type checking with Mypy (strict mode)
mypy apps config

# Linting and style verification with Ruff
ruff check .
ruff format --check .

# Automatically apply Ruff lint and formatting fixes
ruff check --fix .
ruff format .
```
