from django.utils import timezone
from apps.patients.models import Patient
from apps.refills.models import RefillRequest
from typing import Any, Dict

def dashboard_overview_get() -> Dict[str, Any]:
    # Use select_related and prefetch_related for optimal queries
    patients = Patient.objects.prefetch_related(
        "prescriptions",
        "refill_requests",
        "refill_requests__intake_telemetry",
        "refill_requests__triage_record",
        "refill_requests__adjudication",
        "refill_requests__voucher"
    ).filter(is_deleted=False)

    patient_data = []
    total_cycles = 0
    flagged_cycles = 0
    active_rx = 0

    for patient in patients:
        active_prescriptions = [rx for rx in patient.prescriptions.all() if rx.is_active and not rx.is_deleted]
        active_rx += len(active_prescriptions)

        rx_data = [
            {
                "id": str(rx.id),
                "medication_name": rx.medication_name,
                "dosage": rx.dosage,
                "last_dispensed_at": rx.last_dispensed_at.isoformat() if rx.last_dispensed_at else None,
            }
            for rx in active_prescriptions
        ]

        cycles = []
        refill_requests = [req for req in patient.refill_requests.all() if not req.is_deleted]
        
        for req in refill_requests:
            total_cycles += 1
            
            telemetry = getattr(req, "intake_telemetry", None)
            triage = getattr(req, "triage_record", None)
            adjudication = getattr(req, "adjudication", None)
            voucher = getattr(req, "voucher", None)

            if triage and triage.triage_color and triage.triage_color != "GREEN":
                flagged_cycles += 1

            cycles.append({
                "refill_id": str(req.id),
                "submitted_at": req.created_at.isoformat(),
                "systolic": telemetry.systolic if telemetry else None,
                "diastolic": telemetry.diastolic if telemetry else None,
                "glucose": float(telemetry.glucose) if telemetry and telemetry.glucose else None,
                "triage_color": triage.triage_color if triage else None,
                "anomaly_reason": triage.anomaly_reason if triage else None,
                "status": req.status,
                "missed_doses_past_week": req.missed_doses_past_week,
                "has_severe_symptoms": req.has_severe_symptoms,
                "dispensed": bool(voucher and voucher.dispensed_at),
                "dispensed_at": voucher.dispensed_at.isoformat() if voucher and voucher.dispensed_at else None,
                "review_note": adjudication.clinical_notes if adjudication else None,
            })

        patient_data.append({
            "patient_id": str(patient.id),
            "full_name": patient.full_name,
            "national_id": patient.national_id,
            "phone_number": patient.phone_number,
            "baseline_systolic": patient.baseline_systolic,
            "baseline_diastolic": patient.baseline_diastolic,
            "baseline_glucose": float(patient.baseline_glucose) if patient.baseline_glucose else None,
            "active_prescriptions": rx_data,
            "cycles": cycles,
        })

    return {
        "generated_at": timezone.now().isoformat(),
        "total_patients": len(patient_data),
        "active_prescriptions": active_rx,
        "total_cycles": total_cycles,
        "flagged_cycles": flagged_cycles,
        "patients": patient_data,
    }
