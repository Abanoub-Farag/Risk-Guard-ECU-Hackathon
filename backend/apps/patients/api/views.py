import uuid
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.patients.api.serializers import (
    PatientCreateInputSerializer,
    PatientOutputSerializer,
    PrescriptionCreateInputSerializer,
    PrescriptionOutputSerializer,
)
from apps.patients.selectors import patient_get_by_id, prescription_get_by_id
from apps.patients.services import (
    patient_create,
    prescription_create,
    prescription_deactivate,
    prescription_dispense,
)


class PatientListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "patients"

    @extend_schema(
        tags=["Patients"],
        summary="Register a new chronic patient",
        description="Registers a patient with baseline biometrics and an Egyptian National ID.",
        request=PatientCreateInputSerializer,
        responses={201: PatientOutputSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = PatientCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        patient = patient_create(
            national_id=data["national_id"],
            full_name=data["full_name"],
            phone_number=data["phone_number"],
            baseline_systolic=data["baseline_systolic"],
            baseline_diastolic=data["baseline_diastolic"],
            baseline_glucose=data.get("baseline_glucose"),
        )
        return Response(PatientOutputSerializer(patient).data, status=status.HTTP_201_CREATED)


class PatientDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "patients"

    @extend_schema(
        tags=["Patients"],
        summary="Retrieve patient details and active prescriptions",
        description="Returns patient record by UUID alongside active prescriptions prefetched.",
        responses={200: PatientOutputSerializer},
    )
    def get(self, request: Request, patient_id: uuid.UUID) -> Response:
        patient = patient_get_by_id(patient_id=patient_id)
        if not patient:
            raise NotFound("Patient not found.")
        return Response(PatientOutputSerializer(patient).data, status=status.HTTP_200_OK)


class PatientPrescriptionCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "patients"

    @extend_schema(
        tags=["Prescriptions"],
        summary="Add a prescription to a patient",
        description="Creates an active prescription. Rejects duplicate active prescriptions for the same medication.",
        request=PrescriptionCreateInputSerializer,
        responses={201: PrescriptionOutputSerializer},
    )
    def post(self, request: Request, patient_id: uuid.UUID) -> Response:
        patient = patient_get_by_id(patient_id=patient_id)
        if not patient:
            raise NotFound("Patient not found.")

        serializer = PrescriptionCreateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        prescription = prescription_create(
            patient=patient,
            medication_name=data["medication_name"],
            dosage=data["dosage"],
            refill_interval_days=data.get("refill_interval_days", 30),
        )
        return Response(PrescriptionOutputSerializer(prescription).data, status=status.HTTP_201_CREATED)


class PrescriptionDeactivateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "patients"

    @extend_schema(
        tags=["Prescriptions"],
        summary="Deactivate a prescription",
        description="Safely sets prescription is_active status to false.",
        request=None,
        responses={200: PrescriptionOutputSerializer},
    )
    def patch(self, request: Request, prescription_id: uuid.UUID) -> Response:
        prescription = prescription_get_by_id(prescription_id=prescription_id)
        if not prescription:
            raise NotFound("Prescription not found.")

        updated_prescription = prescription_deactivate(prescription=prescription)
        return Response(PrescriptionOutputSerializer(updated_prescription).data, status=status.HTTP_200_OK)


class PrescriptionDispenseAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "patients"

    @extend_schema(
        tags=["Prescriptions"],
        summary="Dispense a prescription",
        description="Records dispensation by updating last_dispensed_at to current timestamp.",
        request=None,
        responses={200: PrescriptionOutputSerializer},
    )
    def post(self, request: Request, prescription_id: uuid.UUID) -> Response:
        prescription = prescription_get_by_id(prescription_id=prescription_id)
        if not prescription:
            raise NotFound("Prescription not found.")

        dispensed_prescription = prescription_dispense(prescription=prescription)
        return Response(PrescriptionOutputSerializer(dispensed_prescription).data, status=status.HTTP_200_OK)
