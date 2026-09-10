from decimal import Decimal
from typing import Any
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.refills.models import RefillRequest, RefillStatus
from apps.triage.models import AnomalyReason, IntakeTelemetry, TriageColor, TriageRecord
from apps.triage.selectors import intake_telemetry_get_previous_for_patient


class TriageEvaluationService:
    """
    Domain service executing the multi-layered triage rule engine and coordinating
    telemetry persistence, triage record creation, and refill status transitions.
    """

    @classmethod
    def evaluate_rule_chain(
        cls,
        *,
        refill_request: RefillRequest,
        systolic: int | None,
        diastolic: int | None,
    ) -> tuple[str, str | None, str]:
        """
        Deterministic evaluation of the triage rule hierarchy:
        1. Biological Impossibility (RED - Priority 1)
        2. Anti-Fraud / Identical Reading Trap (RED - Priority 2)
        3. Clinical Variance & Green Path Trigger (GREEN / YELLOW - Priority 3)

        Returns: (triage_color, anomaly_reason, refill_status)
        """
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
        prior_telemetry = intake_telemetry_get_previous_for_patient(
            patient_id=refill_request.patient_id,
            exclude_refill_id=refill_request.id,
        )
        if (
            prior_telemetry is not None
            and prior_telemetry.systolic is not None
            and prior_telemetry.diastolic is not None
            and prior_telemetry.systolic == systolic
            and prior_telemetry.diastolic == diastolic
        ):
            return (
                TriageColor.RED,
                AnomalyReason.SUSPECTED_DATA_FABRICATION,
                RefillStatus.NEEDS_REVIEW,
            )

        # --- Step 3: Clinical Variance & Green Path Trigger (Priority 3) ---
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
    def process_intake_and_evaluate(
        cls,
        *,
        refill_request: RefillRequest,
        systolic: int | None,
        diastolic: int | None,
        glucose: Decimal | None,
    ) -> tuple[TriageRecord, IntakeTelemetry]:
        """
        Atomic orchestration of telemetry logging, deterministic triage evaluation, 
        TriageRecord creation, and RefillRequest status update.
        """
        # Strict 1:1 invariant enforcement
        if hasattr(refill_request, "triage_record") or TriageRecord.objects.filter(refill_request=refill_request).exists():
            raise ApplicationError(
                message=f"Triage record already exists for refill request '{refill_request.id}'.",
                code="triage_record_conflict",
                status_code=status.HTTP_409_CONFLICT,
            )

        if systolic is None or diastolic is None:
            raise ApplicationError(
                message="Cannot execute triage evaluation without systolic and diastolic readings.",
                code="missing_telemetry",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Log intake telemetry result
        telemetry = IntakeTelemetry.objects.create(
            refill_request=refill_request,
            systolic=systolic,
            diastolic=diastolic,
            glucose=glucose,
            processed_at=timezone.now(),
        )

        # Execute rule chain
        triage_color, anomaly_reason, new_status = cls.evaluate_rule_chain(
            refill_request=refill_request,
            systolic=systolic,
            diastolic=diastolic,
        )

        # Persist triage record
        triage_record = TriageRecord.objects.create(
            refill_request=refill_request,
            triage_color=triage_color,
            anomaly_reason=anomaly_reason,
            evaluated_at=timezone.now(),
        )

        # Synchronize parent refill request status
        from apps.refills.services import refill_request_update_status
        refill_request = refill_request_update_status(
            refill_request=refill_request,
            new_status=new_status,
        )

        # Automatically issue digital e-prescription voucher upon claim approval
        if new_status == RefillStatus.APPROVED:
            from apps.vouchers.services import voucher_issue_for_refill
            voucher_issue_for_refill(refill_request=refill_request)

        return triage_record, telemetry
