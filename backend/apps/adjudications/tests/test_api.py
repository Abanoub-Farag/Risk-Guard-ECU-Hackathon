import uuid
from datetime import timedelta
from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.adjudications.models import (
    AdjudicationDecision,
    ManualAdjudication,
    RejectionReasonCategory,
)
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus
from apps.triage.models import AnomalyReason, IntakeTelemetry, TriageColor, TriageRecord

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client() -> APIClient:
    user = User.objects.create_user(username="lead_cardiologist", password="password123")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def patient() -> Patient:
    return Patient.objects.create(
        national_id="29001010101234",
        full_name="Mahmoud Salem",
        phone_number="+201001234567",
        baseline_systolic=120,
        baseline_diastolic=80,
        baseline_glucose=Decimal("110.50"),
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


def _prescription(patient: Patient, name: str) -> PatientPrescription:
    return PatientPrescription.objects.create(
        patient=patient,
        medication_name=name,
        dosage="5mg daily",
        refill_interval_days=30,
        is_active=True,
    )


class TestAdjudicationQueueAPI:
    """
    Integration tests for GET /api/v1/adjudications/queue
    """

    def test_queue_sorting_prioritizes_red_over_yellow_and_fifo(
        self,
        auth_client: APIClient,
        patient: Patient,
    ) -> None:
        now = timezone.now()

        def new_claim(color: str, reason: str | None, hours_ago: int, status_tag: str = RefillStatus.NEEDS_REVIEW):
            rx = _prescription(patient, f"Med-{color}-{hours_ago}-{now.microsecond}")
            refill = RefillRequest.objects.create(
                patient=patient,
                prescription=rx,
                status=status_tag,
            )
            RefillRequest.objects.filter(id=refill.id).update(submitted_at=now - timedelta(hours=hours_ago))
            TriageRecord.objects.create(
                refill_request=refill,
                triage_color=color,
                anomaly_reason=reason,
            )
            return refill

        # Claim 1: YELLOW, submitted 2 hours ago
        r1 = new_claim(TriageColor.YELLOW, AnomalyReason.CLINICAL_VARIANCE_EXCEEDED, 2)
        # Claim 2: RED, submitted 1 hour ago (newer, but higher priority)
        r2 = new_claim(TriageColor.RED, AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY, 1)
        # Claim 3: RED, submitted 3 hours ago (older RED -> should precede r2)
        r3 = new_claim(TriageColor.RED, AnomalyReason.SUSPECTED_DATA_FABRICATION, 3)
        # Claim 4: APPROVED (must not appear in queue)
        new_claim(TriageColor.GREEN, None, 1, status_tag=RefillStatus.APPROVED)

        url = "/api/v1/adjudications/queue"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        results = response.json()["results"]
        assert len(results) == 3

        # Ordering: r3 (RED, 3h ago) -> r2 (RED, 1h ago) -> r1 (YELLOW, 2h ago)
        assert results[0]["id"] == str(r3.id)
        assert results[0]["triage_color"] == TriageColor.RED

        assert results[1]["id"] == str(r2.id)
        assert results[1]["triage_color"] == TriageColor.RED

        assert results[2]["id"] == str(r1.id)
        assert results[2]["triage_color"] == TriageColor.YELLOW

    def test_queue_filter_by_triage_color(
        self,
        auth_client: APIClient,
        patient: Patient,
    ) -> None:
        r_red = RefillRequest.objects.create(
            patient=patient,
            prescription=_prescription(patient, "FilteringMedRed"),
            status=RefillStatus.NEEDS_REVIEW,
        )
        TriageRecord.objects.create(
            refill_request=r_red,
            triage_color=TriageColor.RED,
            anomaly_reason=AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY,
        )

        r_yellow = RefillRequest.objects.create(
            patient=patient,
            prescription=_prescription(patient, "FilteringMedYellow"),
            status=RefillStatus.NEEDS_REVIEW,
        )
        TriageRecord.objects.create(
            refill_request=r_yellow,
            triage_color=TriageColor.YELLOW,
            anomaly_reason=AnomalyReason.CLINICAL_VARIANCE_EXCEEDED,
        )

        url = "/api/v1/adjudications/queue?triage_color=RED"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.json()["results"]
        assert len(results) == 1
        assert results[0]["id"] == str(r_red.id)


class TestAdjudicationClaimDetailAPI:
    """
    Integration tests for GET /api/v1/adjudications/queue/{refill_request_id}
    """

    def test_claim_detail_returns_comprehensive_context(
        self,
        auth_client: APIClient,
        patient: Patient,
    ) -> None:
        # Prior refill with telemetry for historical context
        prior_rx = _prescription(patient, "HistoricalMed")
        prior_refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prior_rx,
            status=RefillStatus.APPROVED,
        )
        IntakeTelemetry.objects.create(
            refill_request=prior_refill,
            systolic=118,
            diastolic=78,
            glucose=None,
        )

        # Current refill claim under review
        current_rx = _prescription(patient, "CurrentMed")
        current_refill = RefillRequest.objects.create(
            patient=patient,
            prescription=current_rx,
            status=RefillStatus.NEEDS_REVIEW,
            missed_doses_past_week=1,
            has_severe_symptoms=False,
        )
        TriageRecord.objects.create(
            refill_request=current_refill,
            triage_color=TriageColor.YELLOW,
            anomaly_reason=AnomalyReason.CLINICAL_VARIANCE_EXCEEDED,
        )
        IntakeTelemetry.objects.create(
            refill_request=current_refill,
            systolic=150,
            diastolic=95,
            glucose=Decimal("142.00"),
        )

        url = f"/api/v1/adjudications/queue/{current_refill.id}"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["refill_request_id"] == str(current_refill.id)
        assert data["status"] == RefillStatus.NEEDS_REVIEW
        assert data["patient"]["national_id"] == "29001010101234"
        assert data["patient"]["baseline_systolic"] == 120
        assert data["prescription"]["medication_name"] == "CurrentMed"
        assert data["triage"]["triage_color"] == TriageColor.YELLOW
        assert data["triage"]["anomaly_reason"] == AnomalyReason.CLINICAL_VARIANCE_EXCEEDED
        assert data["current_telemetry"]["systolic"] == 150
        assert data["current_telemetry"]["diastolic"] == 95
        assert data["prior_cycle_telemetry"]["systolic"] == 118
        assert data["adjudication"] is None

    def test_claim_detail_nonexistent_returns_404(
        self,
        auth_client: APIClient,
    ) -> None:
        fake_id = uuid.uuid4()
        url = f"/api/v1/adjudications/queue/{fake_id}"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAdjudicateRefillAPI:
    """
    Integration tests for POST /api/v1/refill-requests/{id}/adjudicate
    """

    def test_adjudicate_approve_success(
        self,
        auth_client: APIClient,
        patient: Patient,
        prescription: PatientPrescription,
    ) -> None:
        refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.NEEDS_REVIEW,
        )

        url = f"/api/v1/refill-requests/{refill.id}/adjudicate"
        payload = {
            "decision": "APPROVE",
            "clinical_notes": "Reviewed patient lab work; mild systolic elevation is transient and acceptable.",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["refill_request_id"] == str(refill.id)
        assert data["decision"] == AdjudicationDecision.APPROVE
        assert data["rejection_reason_category"] is None

        refill.refresh_from_db()
        assert refill.status == RefillStatus.APPROVED
        assert ManualAdjudication.objects.filter(refill_request=refill).count() == 1

    def test_adjudicate_reject_success(
        self,
        auth_client: APIClient,
        patient: Patient,
        prescription: PatientPrescription,
    ) -> None:
        refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.NEEDS_REVIEW,
        )

        url = f"/api/v1/refill-requests/{refill.id}/adjudicate"
        payload = {
            "decision": "REJECT",
            "rejection_reason_category": RejectionReasonCategory.SUSPECTED_FRAUD_TAMPERING,
            "clinical_notes": "Identical vital signature as prior submission. Suspected fraudulent duplication.",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["decision"] == AdjudicationDecision.REJECT
        assert data["rejection_reason_category"] == RejectionReasonCategory.SUSPECTED_FRAUD_TAMPERING

        refill.refresh_from_db()
        assert refill.status == RefillStatus.REJECTED

    def test_adjudicate_reject_missing_category_returns_400(
        self,
        auth_client: APIClient,
        patient: Patient,
        prescription: PatientPrescription,
    ) -> None:
        refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.NEEDS_REVIEW,
        )

        url = f"/api/v1/refill-requests/{refill.id}/adjudicate"
        payload = {
            "decision": "REJECT",
            "clinical_notes": "Rejection without clinical reason category provided.",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_adjudicate_conflict_when_already_adjudicated(
        self,
        auth_client: APIClient,
        patient: Patient,
        prescription: PatientPrescription,
    ) -> None:
        refill = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.NEEDS_REVIEW,
        )

        url = f"/api/v1/refill-requests/{refill.id}/adjudicate"
        payload = {
            "decision": "APPROVE",
            "clinical_notes": "Initial approval clearance justification notes.",
        }
        res1 = auth_client.post(url, payload, format="json")
        assert res1.status_code == status.HTTP_201_CREATED

        # Second adjudication call yields 409 Conflict
        res2 = auth_client.post(url, payload, format="json")
        assert res2.status_code == status.HTTP_409_CONFLICT
        assert res2.json()["code"] in ("adjudication_already_exists", "invalid_refill_status_for_adjudication")

    def test_adjudicate_nonexistent_refill_returns_404(
        self,
        auth_client: APIClient,
    ) -> None:
        fake_id = uuid.uuid4()
        url = f"/api/v1/refill-requests/{fake_id}/adjudicate"
        payload = {
            "decision": "APPROVE",
            "clinical_notes": "Adjudicating nonexistent claim notes.",
        }
        response = auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND