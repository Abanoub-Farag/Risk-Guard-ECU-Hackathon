from django.urls import path
from apps.patients.api.views import (
    PatientDetailAPIView,
    PatientListCreateAPIView,
    PatientPrescriptionCreateAPIView,
    PrescriptionDeactivateAPIView,
    PrescriptionDispenseAPIView,
)

app_name = "patients"

urlpatterns = [
    path("patients/", PatientListCreateAPIView.as_view(), name="patient-list-create"),
    path("patients/<uuid:patient_id>/", PatientDetailAPIView.as_view(), name="patient-detail"),
    path(
        "patients/<uuid:patient_id>/prescriptions/",
        PatientPrescriptionCreateAPIView.as_view(),
        name="patient-prescription-create",
    ),
    path(
        "prescriptions/<uuid:prescription_id>/deactivate/",
        PrescriptionDeactivateAPIView.as_view(),
        name="prescription-deactivate",
    ),
    path(
        "prescriptions/<uuid:prescription_id>/dispense/",
        PrescriptionDispenseAPIView.as_view(),
        name="prescription-dispense",
    ),
]
