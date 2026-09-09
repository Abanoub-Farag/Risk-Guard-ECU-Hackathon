from decimal import Decimal
import pytest
from apps.common.exceptions import ApplicationError
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import DeviceScan, DeviceType, RefillRequest, RefillStatus
from apps.triage.models import AnomalyReason, OCRResult, TriageColor, TriageRecord
from apps.triage.ocr_client import MockOcrEngineClient, OcrExtractionResult
from apps.triage.services import TriageEvaluationService

pytestmark = pytest.mark.django_db


@pytest.fixture
def patient() -> Patient:
    return Patient.objects.create(
        national_id="29001010101234",
        full_name="Mahmoud Salem",
        phone_number="+201001234567",
        baseline_systolic=100,
        baseline_diastolic=80,
    )


@pytest.fixture
def prescription(patient: Patient) -> PatientPrescription:
    return PatientPrescription.objects.create(
        patient=patient,
        medication_name="Lisinopril",
        dosage="10mg daily",
        refill_interval_days=30,
        is_active=True,
    )


@pytest.fixture
def refill_request(patient: Patient, prescription: PatientPrescription) -> RefillRequest:
    return RefillRequest.objects.create(
        patient=patient,
        prescription=prescription,
        status=RefillStatus.SUBMITTED,
        has_severe_symptoms=False,
    )


class TestTriageRuleHierarchy:
    """
    Unit tests for deterministic 4-step triage rule evaluation:
    1. Biological Impossibility (RED)
    2. Identical Reading Anti-Fraud Trap (RED)
    3. Low OCR Confidence (YELLOW)
    4. Clinical Variance & Green Path (GREEN / YELLOW)
    """

    # --- Step 1: Biological Impossibility Tests ---

    @pytest.mark.parametrize(
        "systolic,diastolic,expected_color,expected_reason",
        [
            (69, 60, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),
            (241, 80, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),
            (120, 39, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),
            (150, 141, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),
            (80, 80, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),  # Systolic <= Diastolic
            (70, 75, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),  # Inverted
            (None, 80, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),
            (120, None, TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY),
        ],
    )
    def test_biological_impossibility_boundaries(
        self,
        refill_request: RefillRequest,
        systolic: int | None,
        diastolic: int | None,
        expected_color: str,
        expected_reason: str,
    ) -> None:
        extraction = OcrExtractionResult(
            confidence_score=Decimal("0.9500"),
            systolic=systolic,
            diastolic=diastolic,
        )
        color, reason, status_code = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction,
        )
        assert color == expected_color
        assert reason == expected_reason
        assert status_code == RefillStatus.NEEDS_REVIEW

    def test_biological_possibility_exact_valid_boundaries(
        self,
        refill_request: RefillRequest,
    ) -> None:
        # Systolic 70 (min valid), Diastolic 50
        extraction_min = OcrExtractionResult(
            confidence_score=Decimal("0.9000"),
            systolic=80,
            diastolic=64,
        )
        color, reason, status_code = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction_min,
        )
        # Not flagged as biological impossibility
        assert reason != AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY

    # --- Step 2: Anti-Fraud Identical Reading Trap Tests ---

    def test_fraud_trap_triggers_on_identical_readings(
        self,
        patient: Patient,
        prescription: PatientPrescription,
        refill_request: RefillRequest,
    ) -> None:
        # Create prior refill request and prior OCR result for the same patient
        prior_refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.APPROVED,
        )
        OCRResult.objects.create(
            refill_request=prior_refill,
            confidence_score=Decimal("0.9500"),
            systolic=115,
            diastolic=75,
        )

        # Current extraction has identical systolic and diastolic
        current_extraction = OcrExtractionResult(
            confidence_score=Decimal("0.9800"),
            systolic=115,
            diastolic=75,
        )

        color, reason, status_code = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=current_extraction,
        )
        assert color == TriageColor.RED
        assert reason == AnomalyReason.SUSPECTED_DATA_FABRICATION
        assert status_code == RefillStatus.NEEDS_REVIEW

    def test_fraud_trap_bypassed_when_readings_differ(
        self,
        patient: Patient,
        prescription: PatientPrescription,
        refill_request: RefillRequest,
    ) -> None:
        prior_refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.APPROVED,
        )
        OCRResult.objects.create(
            refill_request=prior_refill,
            confidence_score=Decimal("0.9500"),
            systolic=115,
            diastolic=75,
        )

        # Different reading -> should proceed past Step 2
        current_extraction = OcrExtractionResult(
            confidence_score=Decimal("0.9500"),
            systolic=110,
            diastolic=74,
        )

        color, reason, status_code = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=current_extraction,
        )
        assert reason != AnomalyReason.SUSPECTED_DATA_FABRICATION
        assert color == TriageColor.GREEN
        assert status_code == RefillStatus.APPROVED

    # --- Step 3: Low Confidence Verification Tests ---

    @pytest.mark.parametrize("confidence", ["0.8499", "0.5000", "0.0000", "0.8400"])
    def test_low_ocr_confidence_branch(
        self,
        refill_request: RefillRequest,
        confidence: str,
    ) -> None:
        extraction = OcrExtractionResult(
            confidence_score=Decimal(confidence),
            systolic=100,
            diastolic=80,
        )
        color, reason, status_code = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction,
        )
        assert color == TriageColor.YELLOW
        assert reason == AnomalyReason.LOW_OCR_CONFIDENCE
        assert status_code == RefillStatus.NEEDS_REVIEW

    # --- Step 4: Clinical Variance & Green Path Tests ---

    def test_clinical_variance_exact_boundaries_pass_green(
        self,
        refill_request: RefillRequest,
    ) -> None:
        # Patient baseline: systolic=100 (range: [80, 120]), diastolic=80 (range: [64, 96])
        # Exact -20% boundary: (80, 64)
        extraction_lower = OcrExtractionResult(
            confidence_score=Decimal("0.8500"),
            systolic=80,
            diastolic=64,
        )
        color_low, reason_low, status_low = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction_lower,
        )
        assert color_low == TriageColor.GREEN
        assert reason_low is None
        assert status_low == RefillStatus.APPROVED

        # Exact +20% boundary: (120, 96)
        extraction_upper = OcrExtractionResult(
            confidence_score=Decimal("0.8500"),
            systolic=120,
            diastolic=96,
        )
        color_up, reason_up, status_up = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction_upper,
        )
        assert color_up == TriageColor.GREEN
        assert reason_up is None
        assert status_up == RefillStatus.APPROVED

    @pytest.mark.parametrize(
        "systolic,diastolic",
        [
            (121, 80),   # Systolic > +20% (120)
            (79, 65),    # Systolic < -20% (80), valid physiological BP (79 > 65)
            (100, 97),   # Diastolic > +20% (96)
            (100, 63),   # Diastolic < -20% (64)
        ],
    )
    def test_clinical_variance_exceeded_branch(
        self,
        refill_request: RefillRequest,
        systolic: int,
        diastolic: int,
    ) -> None:
        extraction = OcrExtractionResult(
            confidence_score=Decimal("0.9000"),
            systolic=systolic,
            diastolic=diastolic,
        )
        color, reason, status_code = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction,
        )
        assert color == TriageColor.YELLOW
        assert reason == AnomalyReason.CLINICAL_VARIANCE_EXCEEDED
        assert status_code == RefillStatus.NEEDS_REVIEW

    def test_severe_symptoms_override_prevents_green(
        self,
        refill_request: RefillRequest,
    ) -> None:
        # Baseline within range and confidence >= 0.85, but severe symptoms = True
        refill_request.has_severe_symptoms = True
        refill_request.save(update_fields=["has_severe_symptoms"])

        extraction = OcrExtractionResult(
            confidence_score=Decimal("0.9500"),
            systolic=100,
            diastolic=80,
        )
        color, reason, status_code = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            extraction=extraction,
        )
        assert color != TriageColor.GREEN
        assert color == TriageColor.YELLOW
        assert reason == AnomalyReason.SEVERE_SYMPTOMS_REPORTED
        assert status_code == RefillStatus.NEEDS_REVIEW


class TestTriageServiceProcess:
    """
    Tests for TriageEvaluationService.process_ocr_and_evaluate orchestration.
    """

    def test_process_ocr_missing_scan_raises_error(
        self,
        refill_request: RefillRequest,
    ) -> None:
        with pytest.raises(ApplicationError) as exc_info:
            TriageEvaluationService.process_ocr_and_evaluate(
                refill_request=refill_request,
            )
        assert exc_info.value.code == "missing_device_scan"

    def test_process_ocr_nonexistent_scan_id_raises_error(
        self,
        refill_request: RefillRequest,
    ) -> None:
        import uuid
        with pytest.raises(ApplicationError) as exc_info:
            TriageEvaluationService.process_ocr_and_evaluate(
                refill_request=refill_request,
                scan_id=uuid.uuid4(),
            )
        assert exc_info.value.code == "device_scan_not_found"

    def test_process_ocr_full_execution_success(
        self,
        refill_request: RefillRequest,
    ) -> None:
        # Attach scan
        scan = DeviceScan.objects.create(
            refill_request=refill_request,
            device_type=DeviceType.BLOOD_PRESSURE,
            image_storage_uri="s3://compliant-vault/scans/sample.jpg",
        )

        client = MockOcrEngineClient(
            default_result=OcrExtractionResult(
                confidence_score=Decimal("0.9200"),
                systolic=105,
                diastolic=78,
                glucose=None,
                raw_payload={"vendor": "omron", "confidence": 0.92},
            )
        )

        triage_record, ocr_result = TriageEvaluationService.process_ocr_and_evaluate(
            refill_request=refill_request,
            scan_id=scan.id,
            ocr_client=client,
        )

        assert triage_record.triage_color == TriageColor.GREEN
        assert triage_record.anomaly_reason is None
        assert ocr_result.confidence_score == Decimal("0.9200")
        assert ocr_result.systolic == 105
        assert ocr_result.diastolic == 78

        refill_request.refresh_from_db()
        assert refill_request.status == RefillStatus.APPROVED
