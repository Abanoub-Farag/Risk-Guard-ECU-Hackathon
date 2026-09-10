import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.adjudications.services import adjudication_submit
from apps.common.services import user_create
from apps.patients.models import Patient
from apps.patients.services import patient_create, prescription_create
from apps.refills.models import RefillRequest
from apps.refills.services import refill_request_create
from apps.triage.services import TriageEvaluationService
from apps.vouchers.models import PharmacyVoucher


class Command(BaseCommand):
    help = "Seed demo data: users, patients, prescriptions, refills, triage, adjudications and vouchers."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Wipe existing domain rows before seeding.",
        )

    def handle(self, *args, **options):
        if options["force"]:
            RefillRequest.objects.all().delete()
            from apps.patients.models import PatientPrescription

            PatientPrescription.objects.all().delete()
            Patient.objects.all().delete()

        if Patient.objects.exists():
            self.stdout.write(self.style.WARNING("Demo data already present. Use --force to reseed."))
            return

        admin = self._get_or_create_user("admin", "RiskGuard@123", is_staff=True, is_superuser=True)
        doctor = self._get_or_create_user("doctor", "RiskGuard@123", is_staff=True)
        self._get_or_create_user("pharmacy", "RiskGuard@123")

        patients = self._seed_patients()
        vouchers: list[PharmacyVoucher] = []

        omar, mona, khaled, sara = patients

        rx_omar = prescription_create(
            patient=omar,
            medication_name="Amlodipine 10mg",
            dosage="1 tablet daily",
            refill_interval_days=30,
        )
        rx_mona = prescription_create(
            patient=mona,
            medication_name="Metformin 500mg",
            dosage="1 tablet twice daily",
            refill_interval_days=30,
        )
        rx_khaled = prescription_create(
            patient=khaled,
            medication_name="Metoprolol 50mg",
            dosage="1 tablet daily",
            refill_interval_days=30,
        )
        rx_sara = prescription_create(
            patient=sara,
            medication_name="Insulin Glargine 100IU",
            dosage="20 units nightly",
            refill_interval_days=30,
        )

        for rx in (rx_omar, rx_mona, rx_khaled, rx_sara):
            rx.last_dispensed_at = timezone.now() - timedelta(days=35)
            rx.save(update_fields=["last_dispensed_at", "updated_at"])

        green_refill = refill_request_create(
            patient_id=omar.id,
            prescription_id=rx_omar.id,
            missed_doses_past_week=0,
            has_severe_symptoms=False,
        )
        red_refill = refill_request_create(
            patient_id=mona.id,
            prescription_id=rx_mona.id,
            missed_doses_past_week=3,
            has_severe_symptoms=True,
        )
        yellow_refill = refill_request_create(
            patient_id=khaled.id,
            prescription_id=rx_khaled.id,
            missed_doses_past_week=1,
            has_severe_symptoms=False,
        )
        reject_refill = refill_request_create(
            patient_id=sara.id,
            prescription_id=rx_sara.id,
            missed_doses_past_week=5,
            has_severe_symptoms=True,
        )

        TriageEvaluationService.process_intake_and_evaluate(
            refill_request=green_refill,
            systolic=128,
            diastolic=84,
            glucose=Decimal("112.00"),
        )
        TriageEvaluationService.process_intake_and_evaluate(
            refill_request=red_refill,
            systolic=300,
            diastolic=165,
            glucose=None,
        )
        TriageEvaluationService.process_intake_and_evaluate(
            refill_request=yellow_refill,
            systolic=165,
            diastolic=100,
            glucose=Decimal("95.00"),
        )
        TriageEvaluationService.process_intake_and_evaluate(
            refill_request=reject_refill,
            systolic=96,
            diastolic=58,
            glucose=None,
        )

        # Manual adjudications: approve the RED claim, reject the YELLOW claim.
        reviewer_id = uuid.uuid5(uuid.NAMESPACE_DNS, str(doctor.id))
        approved_review = adjudication_submit(
            refill_request_id=red_refill.id,
            reviewer_user_id=reviewer_id,
            decision="APPROVE",
            clinical_notes="Vitals verified manually with home device; acceptable for this patient.",
        )
        if hasattr(approved_review.refill_request, "voucher"):
            vouchers.append(approved_review.refill_request.voucher)

        adjudication_submit(
            refill_request_id=reject_refill.id,
            reviewer_user_id=reviewer_id,
            decision="REJECT",
            clinical_notes="Uncontrolled hypotension and repeated missed doses warrant re-consultation.",
            rejection_reason_category="PHYSIOLOGICAL_DANGER",
        )

        green_voucher = green_refill.voucher if hasattr(green_refill, "voucher") else None
        if green_voucher:
            vouchers.append(green_voucher)

        self.stdout.write(self.style.SUCCESS("\n=== Seed complete ==="))
        self.stdout.write(f"Admin user: admin / RiskGuard@123")
        self.stdout.write(f"Reviewer user: doctor / RiskGuard@123")
        self.stdout.write("\nPatients:")
        for p in patients:
            self.stdout.write(f"  - {p.full_name} ({p.national_id})")
        self.stdout.write("\nVouchers (for POS demo):")
        for v in vouchers:
            self.stdout.write(f"  - {v.voucher_code} (status={v.status}, expires={v.expires_at:%Y-%m-%d %H:%M})")
        self.stdout.write("\nQueue: 1 claim awaiting review (Mon.)")

    def _get_or_create_user(self, username, password, is_staff=False, is_superuser=False):
        user = User.objects.filter(username=username).first()
        if user:
            return user
        user = user_create(username=username, password=password)
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.save()
        return user

    def _seed_patients(self):
        specs = [
            {
                "national_id": "30109280101234",
                "full_name": "Omar Hassan",
                "phone_number": "+201012345678",
                "baseline_systolic": 130,
                "baseline_diastolic": 85,
                "baseline_glucose": Decimal("110.00"),
            },
            {
                "national_id": "30212310178905",
                "full_name": "Mona Ali",
                "phone_number": "+201098765432",
                "baseline_systolic": 140,
                "baseline_diastolic": 90,
                "baseline_glucose": Decimal("150.00"),
            },
            {
                "national_id": "28905051504321",
                "full_name": "Khaled Mansour",
                "phone_number": "+201155432198",
                "baseline_systolic": 120,
                "baseline_diastolic": 78,
                "baseline_glucose": None,
            },
            {
                "national_id": "30011201234567",
                "full_name": "Sara Adel",
                "phone_number": "+201022334455",
                "baseline_systolic": 150,
                "baseline_diastolic": 95,
                "baseline_glucose": Decimal("180.00"),
            },
        ]
        patients = []
        for spec in specs:
            patient = patient_create(**spec)
            patients.append(patient)
        return patients