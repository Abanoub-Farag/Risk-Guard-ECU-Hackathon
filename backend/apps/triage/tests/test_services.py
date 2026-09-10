import uuid
from decimal import Decimal
import pytest
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus
from apps.triage.models import AnomalyReason, IntakeTelemetry, TriageColor, TriageRecord
from apps.triage.services import TriageEvaluationService

pytestmark = pytest.mark.django_db


@pytest.fixture
def patient() -> Patient:
    return Patient.objects.create(
        national_id="29001010101234",
        full_name="Mahmoud Salem",
        phone_number="+201001234567",
        baseline_systolic=120,
        baseline_diastolic=80,
    )


@pytest.fixture
def prescription(patient: Patient) -> PatientPrescription:
    return PatientPrescription.objects.create(
        patient=patient,
        medication_name="Amlodipine",
        dosage="5mg daily",
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


class TestTriageEvaluationService:
    def test_evaluate_rule_chain_biological_impossibility_missing(self, refill_request: RefillRequest) -> None:
        color, anomaly, status_val = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            systolic=None,
            diastolic=80,
        )
        assert color == TriageColor.RED
        assert anomaly == AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY
        assert status_val == RefillStatus.NEEDS_REVIEW

    def test_evaluate_rule_chain_biological_impossibility_out_of_bounds(self, refill_request: RefillRequest) -> None:
        color, anomaly, status_val = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            systolic=300,
            diastolic=80,
        )
        assert color == TriageColor.RED
        assert anomaly == AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY

    def test_evaluate_rule_chain_anti_fraud(self, patient: Patient, refill_request: RefillRequest, prescription: PatientPrescription) -> None:
        # Seed prior telemetry
        prior_refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.APPROVED,
        )
        IntakeTelemetry.objects.create(
            refill_request=prior_refill,
            systolic=122,
            diastolic=81,
        )

        color, anomaly, status_val = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            systolic=122,
            diastolic=81,
        )
        assert color == TriageColor.RED
        assert anomaly == AnomalyReason.SUSPECTED_DATA_FABRICATION

    def test_evaluate_rule_chain_clinical_variance(self, refill_request: RefillRequest) -> None:
        color, anomaly, status_val = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            systolic=150,  # 150 > 120 * 1.2 (144)
            diastolic=80,
        )
        assert color == TriageColor.YELLOW
        assert anomaly == AnomalyReason.CLINICAL_VARIANCE_EXCEEDED

    def test_evaluate_rule_chain_severe_symptoms(self, refill_request: RefillRequest) -> None:
        refill_request.has_severe_symptoms = True
        refill_request.save()

        color, anomaly, status_val = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            systolic=120,
            diastolic=80,
        )
        assert color == TriageColor.YELLOW
        assert anomaly == AnomalyReason.SEVERE_SYMPTOMS_REPORTED

    def test_evaluate_rule_chain_green_path(self, refill_request: RefillRequest) -> None:
        color, anomaly, status_val = TriageEvaluationService.evaluate_rule_chain(
            refill_request=refill_request,
            systolic=120,
            diastolic=80,
        )
        assert color == TriageColor.GREEN
        assert anomaly is None
        assert status_val == RefillStatus.APPROVED

    def test_process_intake_and_evaluate_success(self, refill_request: RefillRequest) -> None:
        record, telemetry = TriageEvaluationService.process_intake_and_evaluate(
            refill_request=refill_request,
            systolic=120,
            diastolic=80,
            glucose=Decimal("100.5"),
        )
        assert record.triage_color == TriageColor.GREEN
        assert telemetry.systolic == 120
        assert telemetry.glucose == Decimal("100.5")
