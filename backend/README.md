# Risk Guard Backend System

## 1. System Overview & Architecture

**Domain Purpose:**
The backend system is dedicated to chronic disease management, biometrics verification, OCR automated triage, anti-fraud anomaly detection, and secure Point-of-Sale (POS) voucher redemption. It serves as the core intelligence layer for securely ingesting patient biometric data and determining strict clinical workflows.

**Architectural Principles:**
The application is built using a strict layered architecture pattern (`API/Transport` -> `Application/Services` -> `Domain Core/Value Objects` -> `Infrastructure/Persistence`). This pattern emphasizes strict transaction boundaries and defensive domain invariant enforcement, ensuring that state mutations only occur through designated service layer boundaries.

**Decommissioning Notice:**
The legacy `orders` module has been completely retired and structurally removed from the codebase. It has been replaced by the unified patient identity and monthly refill domain.

---

## 2. Domain Features & State Machines

### Patient Identity & Baseline Biometrics
- Egyptian National ID verification enforced via a 14-digit structural breakdown (validating century, birthdate, and governorate codes `01-88`).
- Anchors patient baseline blood pressure and glucose readings for physiological baseline monitoring.

### Refill Intake & Storage Compliance
- **Anti-Spam Early Refill Blocker:** Enforces a 25-day early refill blockade: `Current Time < Last Dispensed At + 25 days`.
- Handles multi-part device scan image ingestion, mapping uploaded assets to sovereign Egyptian storage compliance mandates.

### OCR Telemetry & Automated Triage Engine
Operates on a deterministic priority hierarchy evaluation engine:
1. **Biological Impossibility Check (RED):** Flags records where Systolic ∉ [70, 240], Diastolic ∉ [40, 140], or Systolic ≤ Diastolic.
2. **Anti-Fraud Trap (RED):** Exact match between the current reading and the immediately preceding cycle reading (`SUSPECTED_DATA_FABRICATION`).
3. **Confidence Verification (YELLOW):** OCR extraction confidence score falls below `0.8500`.
4. **Clinical Variance & Green Path (GREEN / YELLOW):** Evaluates a ±20% variance threshold against physiological baseline anchors. Checks for explicitly reported severe symptoms.

### Human Clinician Adjudication
- **Terminal Authority Invariant:** Automated systems evaluate priority but never definitively reject claims. Only human, licensed reviewers can adjudicate a claim to `REJECTED`.
- Mandates substantive clinical justification notes and rejection categories for auditability.

### Cryptographic Vouchers & POS Dispensing
- Generates 16-character entropy-safe e-prescription tokens for approved refill claims.
- Features a strict 96-hour TTL validity window.
- POS dispensing requires strict identity cross-matching against the patient's National ID.
- Protected by an atomic concurrency lock (`SELECT ... FOR UPDATE`) to eliminate any possibility of double-redemption race conditions.

---

## 3. Database Schema & Key Invariants

The backend relies on the following core entities and their strictly enforced invariants:

- **`patients`**: Captures demographic and baseline biometrics. Includes check constraints limiting glucose and blood pressure ranges.
- **`patient_prescriptions`**: Tracks active medication profiles. Contains a partial unique index enforcing only one active prescription per medication per patient.
- **`refill_requests`**: Tracks the intake lifecycle state machine. Enforces a partial unique constraint preventing multiple active (pending) requests for a single prescription.
- **`device_scans`**: Maps biometric scan images to storage URIs. Enforces a strict one-scan-per-device-type composite constraint per refill request.
- **`ocr_results`**: Stores raw telemetry payloads and algorithm confidence scores extracted from `device_scans`.
- **`triage_records`**: A 1:1 automated clinical triage determination linked directly to a refill intake request.
- **`manual_adjudications`**: 1:1 human review records, requiring clinical justification on rejection.
- **`pharmacy_vouchers`**: Cryptographically secure POS tokens with a 1:1 mapping to an `APPROVED` refill request.

---

## 4. API Reference Summary

### Patients & Prescriptions
- `POST /api/v1/patients/` - Patient registration and baseline establishment.
- `GET /api/v1/patients/{id}/` - Patient profile retrieval.
- `POST /api/v1/patients/{id}/prescriptions/` - Add active prescription.
- `POST /api/v1/patients/prescriptions/{id}/deactivate/` - Deactivate a prescription profile.
- `POST /api/v1/patients/prescriptions/{id}/dispense/` - Direct legacy dispense override.

### Refill Requests & Scans
- `POST /api/v1/refills/intake/` - Request intake initialization and early refill blockage checks.
- `POST /api/v1/refills/intake/{id}/scans/` - Multipart biometric device scan upload.
- `POST /api/v1/refills/intake/{id}/submit/` - Submit pipeline for processing.

### OCR & Triage Pipeline
- `POST /api/v1/triage/process/` - Trigger OCR extraction and triage rule chain evaluations.
- `GET /api/v1/triage/results/{refill_id}/` - Retrieve OCR extraction payload and triage outcome determination.

### Adjudication Queue
- `GET /api/v1/adjudications/queue/` - Clinician queue retrieval prioritized by `RED` FIFO -> `YELLOW` FIFO.
- `GET /api/v1/adjudications/claims/{refill_id}/` - Full claim detail inspection payload.
- `POST /api/v1/adjudications/claims/{refill_id}/decide/` - Submit human adjudication decision (Approvals / Rejections).

### POS Redemption
- `GET /api/v1/vouchers/verify/` - Pre-dispense voucher and identity lookup payload.
- `POST /api/v1/vouchers/redeem/` - Atomic POS redemption and dispensation execution.

---

## 5. Local Setup, Configuration & Test Execution

### Environment Variables
Configure the following required environment variables to bind services:
- `DATABASE_URL`: Connection string for the PostgreSQL persistence layer.
- `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`: Sovereign object storage credentials for image mapping.
- `OCR_SERVICE_URL`, `OCR_API_KEY`: External OCR provider abstraction credentials.
- `PORT`: Service binding port.

### Database Migrations
Ensure the PostgreSQL backend is running, then initialize the database and apply the strictly constrained schema migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

### Testing Commands
The test suite utilizes `pytest`. It includes unit tests for value objects (like the National ID parser and the triage decision tree) alongside comprehensive integration tests for concurrency double-redemption traps, foreign key cascades, and transaction atomicity.

Execute the test suite locally:
```bash
# Execute the complete test suite
pytest

# Target specific domain modules
pytest apps/patients
pytest apps/triage
```
