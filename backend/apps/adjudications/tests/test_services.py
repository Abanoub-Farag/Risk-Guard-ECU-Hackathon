import uuid
import pytest
from django.db import IntegrityError
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.adjudications.models import (
    AdjudicationDecision,
    ManualAdjudication,
    RejectionReasonCategory,
)
from apps.adjudications.services import adjudication_submit
from apps.patients.models import Patient, PatientPrescription
from apps.refills.models import RefillRequest, RefillStatus

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
        medication_name="Lisinopril",
        dosage="10mg daily",
        refill_interval_days=30,
        is_active=True,
    )


@pytest.fixture
def refill_needs_review(patient: Patient, prescription: PatientPrescription) -> RefillRequest:
    return RefillRequest.objects.create(
        patient=patient,
        prescription=prescription,
        status=RefillStatus.NEEDS_REVIEW,
        has_severe_symptoms=False,
    )


class TestAdjudicationServiceValidation:
    """
    Unit tests for adjudication service validation rules, clinical justification requirements,
    and eligibility state checks.
    """

    def test_rejection_missing_reason_category_raises_400(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        with pytest.raises(ApplicationError) as exc:
            adjudication_submit(
                refill_request_id=refill_needs_review.id,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.REJECT,
                clinical_notes="Patient blood pressure reading exceeds safe physiological parameters.",
                rejection_reason_category=None,
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "missing_rejection_reason_category"

    def test_rejection_insufficient_clinical_notes_raises_400(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        with pytest.raises(ApplicationError) as exc:
            adjudication_submit(
                refill_request_id=refill_needs_review.id,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.REJECT,
                clinical_notes="Too short",  # < 10 characters
                rejection_reason_category=RejectionReasonCategory.PHYSIOLOGICAL_DANGER,
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "insufficient_clinical_notes"

    def test_approval_insufficient_clinical_notes_raises_400(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        with pytest.raises(ApplicationError) as exc:
            adjudication_submit(
                refill_request_id=refill_needs_review.id,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.APPROVE,
                clinical_notes="   ",
            )
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "insufficient_clinical_notes"

    def test_approval_succeeds_and_nullifies_rejection_category(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        adjudication = adjudication_submit(
            refill_request_id=refill_needs_review.id,
            reviewer_user_id=reviewer_id,
            decision=AdjudicationDecision.APPROVE,
            clinical_notes="Cardiologist reviewed reading and approved refill based on clinic history.",
            rejection_reason_category=RejectionReasonCategory.PHYSIOLOGICAL_DANGER,  # Should be ignored on APPROVE
        )

        assert adjudication.decision == AdjudicationDecision.APPROVE
        assert adjudication.rejection_reason_category is None
        assert adjudication.reviewer_user_id == reviewer_id

        refill_needs_review.refresh_from_db()
        assert refill_needs_review.status == RefillStatus.APPROVED

    def test_rejection_succeeds_and_transitions_status_to_rejected(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        adjudication = adjudication_submit(
            refill_request_id=refill_needs_review.id,
            reviewer_user_id=reviewer_id,
            decision=AdjudicationDecision.REJECT,
            clinical_notes="Device screen is blurred and reading unidentifiable. Telehealth consultation ordered.",
            rejection_reason_category=RejectionReasonCategory.UNVERIFIABLE_DEVICE_IMAGE,
        )

        assert adjudication.decision == AdjudicationDecision.REJECT
        assert adjudication.rejection_reason_category == RejectionReasonCategory.UNVERIFIABLE_DEVICE_IMAGE

        refill_needs_review.refresh_from_db()
        assert refill_needs_review.status == RefillStatus.REJECTED


class TestHumanTerminalAuthorityAndStateInvariants:
    """
    Verifies human terminal authority, status eligibility constraints, and duplicate traps.
    """

    def test_non_needs_review_status_cannot_be_adjudicated(
        self,
        patient: Patient,
        prescription: PatientPrescription,
    ) -> None:
        reviewer_id = uuid.uuid4()

        # Terminal status APPROVED
        refill_approved = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.APPROVED,
        )
        with pytest.raises(ApplicationError) as exc_app:
            adjudication_submit(
                refill_request_id=refill_approved.id,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.REJECT,
                clinical_notes="Attempting post-approval rejection.",
                rejection_reason_category=RejectionReasonCategory.OTHER,
            )
        assert exc_app.value.status_code == status.HTTP_409_CONFLICT
        assert exc_app.value.code == "invalid_refill_status_for_adjudication"

        # Terminal status REJECTED
        refill_rejected = RefillRequest.objects.create(
            patient=patient,
            prescription=prescription,
            status=RefillStatus.REJECTED,
        )
        with pytest.raises(ApplicationError) as exc_rej:
            adjudication_submit(
                refill_request_id=refill_rejected.id,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.APPROVE,
                clinical_notes="Attempting reversal of rejected claim.",
            )
        assert exc_rej.value.status_code == status.HTTP_409_CONFLICT
        assert exc_rej.value.code == "invalid_refill_status_for_adjudication"

    def test_double_adjudication_concurrency_trap_raises_409(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        # First adjudication
        adjudication_submit(
            refill_request_id=refill_needs_review.id,
            reviewer_user_id=reviewer_id,
            decision=AdjudicationDecision.APPROVE,
            clinical_notes="First clinician review approved successfully.",
        )

        # Second attempt on same refill claim fails with 409
        with pytest.raises(ApplicationError) as exc:
            adjudication_submit(
                refill_request_id=refill_needs_review.id,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.REJECT,
                clinical_notes="Second clinician attempt to reject same claim.",
                rejection_reason_category=RejectionReasonCategory.OTHER,
            )
        assert exc.value.status_code == status.HTTP_409_CONFLICT
        assert exc.value.code == "adjudication_already_exists"

    def test_database_check_constraint_rejects_missing_reason_on_rejection(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        # Direct DB insert bypassing service validation must violate CHECK constraint
        with pytest.raises(IntegrityError):
            ManualAdjudication.objects.create(
                refill_request=refill_needs_review,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.REJECT,
                rejection_reason_category=None,
                clinical_notes="Direct DB insert without rejection category.",
            )

    def test_database_check_constraint_rejects_empty_clinical_notes(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        reviewer_id = uuid.uuid4()
        with pytest.raises(IntegrityError):
            ManualAdjudication.objects.create(
                refill_request=refill_needs_review,
                reviewer_user_id=reviewer_id,
                decision=AdjudicationDecision.REJECT,
                rejection_reason_category=RejectionReasonCategory.OTHER,
                clinical_notes="",
            )

    def test_model_clean_validation_errors(
        self,
        refill_needs_review: RefillRequest,
    ) -> None:
        from django.core.exceptions import ValidationError

        reviewer_id = uuid.uuid4()
        # Empty clinical notes in clean
        adj_empty_notes = ManualAdjudication(
            refill_request=refill_needs_review,
            reviewer_user_id=reviewer_id,
            decision=AdjudicationDecision.APPROVE,
            clinical_notes="   ",
        )
        with pytest.raises(ValidationError):
            adj_empty_notes.clean()

        # Rejection without category in clean
        adj_no_category = ManualAdjudication(
            refill_request=refill_needs_review,
            reviewer_user_id=reviewer_id,
            decision=AdjudicationDecision.REJECT,
            rejection_reason_category=None,
            clinical_notes="Valid notes here for rejection.",
        )
        with pytest.raises(ValidationError):
            adj_no_category.clean()

        # Valid model str
        adj_valid = ManualAdjudication(
            refill_request=refill_needs_review,
            reviewer_user_id=reviewer_id,
            decision=AdjudicationDecision.APPROVE,
            clinical_notes="Valid clinical justification notes.",
        )
        adj_valid.clean()
        assert str(refill_needs_review.id) in str(adj_valid)

