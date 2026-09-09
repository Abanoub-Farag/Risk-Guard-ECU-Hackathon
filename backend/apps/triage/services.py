from decimal import Decimal
from typing import Any
from uuid import UUID
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.refills.models import RefillRequest, RefillStatus
from apps.triage.models import AnomalyReason, OCRResult, TriageColor, TriageRecord
from apps.triage.ocr_client import (
    BaseOcrEngineClient,
    OcrExtractionResult,
    get_ocr_client,
)
from apps.triage.selectors import ocr_result_get_previous_for_patient


class TriageEvaluationService:
    """
    Domain service executing the multi-layered triage rule engine and coordinating
    OCR extraction, triage record persistence, and refill status transitions.
    """

    @classmethod
    def evaluate_rule_chain(
        cls,
        *,
        refill_request: RefillRequest,
        extraction: OcrExtractionResult,
    ) -> tuple[str, str | None, str]:
        """
        Deterministic evaluation of the 4-step triage rule hierarchy:
        1. Biological Impossibility (RED - Priority 1)
        2. Anti-Fraud / Identical Reading Trap (RED - Priority 2)
        3. Confidence Verification (YELLOW - Priority 3)
        4. Clinical Variance & Green Path Trigger (GREEN / YELLOW - Priority 4)

        Returns: (triage_color, anomaly_reason, refill_status)
        """
        systolic = extraction.systolic
        diastolic = extraction.diastolic
        confidence = extraction.confidence_score

        # --- Step 1: Biological Impossibility Check (RED Path - Priority 1) ---
        if systolic is None or diastolic is None:
            return (
                TriageColor.RED,
                AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY,
                RefillStatus.NEEDS_REVIEW,
            )

        if not (70 <= systolic <= 240) or not (40 <= diastolic <= 140) or (systolic <= diastolic):
            return (
                TriageColor.RED,
                AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY,
                RefillStatus.NEEDS_REVIEW,
            )

        # --- Step 2: Identical Reading Trap / Anti-Fraud Check (RED Path - Priority 2) ---
        prior_ocr = ocr_result_get_previous_for_patient(
            patient_id=refill_request.patient_id,
            exclude_refill_id=refill_request.id,
        )
        if (
            prior_ocr is not None
            and prior_ocr.systolic is not None
            and prior_ocr.diastolic is not None
            and prior_ocr.systolic == systolic
            and prior_ocr.diastolic == diastolic
        ):
            return (
                TriageColor.RED,
                AnomalyReason.SUSPECTED_DATA_FABRICATION,
                RefillStatus.NEEDS_REVIEW,
            )

        # --- Step 3: Confidence Verification Check (YELLOW Path - Priority 3) ---
        if confidence < Decimal("0.8500"):
            return (
                TriageColor.YELLOW,
                AnomalyReason.LOW_OCR_CONFIDENCE,
                RefillStatus.NEEDS_REVIEW,
            )

        # --- Step 4: Clinical Variance & Green Path Trigger (Priority 4) ---
        patient = refill_request.patient
        min_systolic = Decimal("0.80") * Decimal(patient.baseline_systolic)
        max_systolic = Decimal("1.20") * Decimal(patient.baseline_systolic)
        min_diastolic = Decimal("0.80") * Decimal(patient.baseline_diastolic)
        max_diastolic = Decimal("1.20") * Decimal(patient.baseline_diastolic)

        systolic_dec = Decimal(systolic)
        diastolic_dec = Decimal(diastolic)

        is_variance_valid = (
            min_systolic <= systolic_dec <= max_systolic
            and min_diastolic <= diastolic_dec <= max_diastolic
        )

        if not is_variance_valid:
            return (
                TriageColor.YELLOW,
                AnomalyReason.CLINICAL_VARIANCE_EXCEEDED,
                RefillStatus.NEEDS_REVIEW,
            )

        if refill_request.has_severe_symptoms:
            return (
                TriageColor.YELLOW,
                AnomalyReason.SEVERE_SYMPTOMS_REPORTED,
                RefillStatus.NEEDS_REVIEW,
            )

        # All clinical qualifications met -> Green Path
        return (
            TriageColor.GREEN,
            None,
            RefillStatus.APPROVED,
        )

    @classmethod
    @transaction.atomic
    def process_ocr_and_evaluate(
        cls,
        *,
        refill_request: RefillRequest,
        scan_id: UUID | None = None,
        ocr_client: BaseOcrEngineClient | None = None,
        override_telemetry: dict[str, Any] | None = None,
    ) -> tuple[TriageRecord, OCRResult]:
        """
        Atomic orchestration of scan retrieval, OCR extraction, OCRResult logging,
        deterministic triage evaluation, TriageRecord creation, and RefillRequest status update.
        """
        # Strict 1:1 invariant enforcement
        if hasattr(refill_request, "triage_record") or TriageRecord.objects.filter(refill_request=refill_request).exists():
            raise ApplicationError(
                message=f"Triage record already exists for refill request '{refill_request.id}'.",
                code="triage_record_conflict",
                status_code=status.HTTP_409_CONFLICT,
            )

        # Resolve target device scan
        if scan_id is not None:
            scan = refill_request.scans.filter(id=scan_id).first()
            if scan is None:
                raise ApplicationError(
                    message=f"Device scan '{scan_id}' not found for refill request '{refill_request.id}'.",
                    code="device_scan_not_found",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        else:
            scan = refill_request.scans.order_by("-captured_at").first()
            has_telemetry_override = bool(
                override_telemetry
                and any(
                    override_telemetry.get(k) is not None
                    for k in ("systolic", "diastolic", "glucose", "confidence_score")
                )
            )
            if scan is None and not has_telemetry_override:
                raise ApplicationError(
                    message="Cannot execute OCR extraction without an uploaded device scan.",
                    code="missing_device_scan",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        image_uri = scan.image_storage_uri if scan else "direct://simulated"

        if ocr_client is None:
            ocr_client = get_ocr_client()

        # Extract telemetry
        extraction = ocr_client.extract_telemetry(
            image_storage_uri=image_uri,
            **(override_telemetry or {}),
        )

        # Log OCR extraction result
        ocr_result = OCRResult.objects.create(
            refill_request=refill_request,
            confidence_score=extraction.confidence_score,
            systolic=extraction.systolic,
            diastolic=extraction.diastolic,
            glucose=extraction.glucose,
            raw_payload=extraction.raw_payload,
            processed_at=timezone.now(),
        )

        # Execute rule chain
        triage_color, anomaly_reason, new_status = cls.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction,
        )

        # Persist triage record
        triage_record = TriageRecord.objects.create(
            refill_request=refill_request,
            triage_color=triage_color,
            anomaly_reason=anomaly_reason,
            evaluated_at=timezone.now(),
        )

        # Synchronize parent refill request status
        refill_request.status = new_status
        refill_request.save(update_fields=["status", "updated_at"])

        return triage_record, ocr_result
