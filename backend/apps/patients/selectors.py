import uuid
from django.db.models import Prefetch, QuerySet
from apps.patients.models import Patient, PatientPrescription


def patient_get_by_id(*, patient_id: uuid.UUID | str) -> Patient | None:
    """
    Retrieves a single patient by UUID with active prescriptions prefetched.
    """
    active_prescriptions_prefetch = Prefetch(
        "prescriptions",
        queryset=PatientPrescription.objects.filter(is_active=True).order_by("-created_at"),
        to_attr="active_prescriptions",
    )
    try:
        return (
            Patient.objects.prefetch_related(active_prescriptions_prefetch)
            .get(id=patient_id)
        )
    except Patient.DoesNotExist:
        return None


def patient_get_by_national_id(*, national_id: str) -> Patient | None:
    """
    Finds a patient record by exact Egyptian National ID.
    """
    try:
        return Patient.objects.get(national_id=national_id)
    except Patient.DoesNotExist:
        return None


def prescription_get_by_id(*, prescription_id: uuid.UUID | str) -> PatientPrescription | None:
    """
    Retrieves a single prescription record by UUID with parent patient prefetched.
    """
    try:
        return (
            PatientPrescription.objects.select_related("patient")
            .get(id=prescription_id)
        )
    except PatientPrescription.DoesNotExist:
        return None


def prescription_list_for_patient(
    *,
    patient_id: uuid.UUID | str,
    active_only: bool = True,
) -> QuerySet[PatientPrescription]:
    """
    Returns an optimized QuerySet of prescriptions for a specific patient.
    """
    queryset = PatientPrescription.objects.filter(patient_id=patient_id).order_by("-created_at")
    if active_only:
        queryset = queryset.filter(is_active=True)
    return queryset
