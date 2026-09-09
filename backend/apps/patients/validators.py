import datetime
import re
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.utils import timezone

EGYPTIAN_NATIONAL_ID_REGEX = re.compile(r"^[0-9]{14}$")

EGYPTIAN_GOVERNORATE_CODES: set[str] = {
    "01",  # Cairo
    "02",  # Alexandria
    "03",  # Port Said
    "04",  # Suez
    "11",  # Damietta
    "12",  # Dakahlia
    "13",  # Ash Sharqia
    "14",  # Kaliobeya
    "15",  # Kafr El Sheikh
    "16",  # Gharbia
    "17",  # Monoufia
    "18",  # El Beheira
    "19",  # Ismailia
    "21",  # Giza
    "22",  # Beni Suef
    "23",  # Faiyum
    "24",  # Minya
    "25",  # Asyut
    "26",  # Sohag
    "27",  # Qena
    "28",  # Aswan
    "29",  # Luxor
    "31",  # Red Sea
    "32",  # New Valley
    "33",  # Matrouh
    "34",  # North Sinai
    "35",  # South Sinai
    "88",  # Born Abroad
}


def validate_egyptian_national_id(national_id: str) -> datetime.date:
    """
    Validates Egyptian National ID according to official Civil Registry specifications:
    - Exactly 14 digits.
    - Century digit: '2' (1900-1999) or '3' (2000-2099).
    - Date of birth: YYMMDD forming a valid calendar date not in the future.
    - Governorate code: Characters 8-9 belonging to official Egyptian governorates (01 to 88).

    Returns the parsed birth date upon success or raises ValidationError.
    """
    if not isinstance(national_id, str) or not EGYPTIAN_NATIONAL_ID_REGEX.match(national_id):
        raise ValidationError(
            "Egyptian National ID must contain exactly 14 numeric digits.",
            code="invalid_national_id_format",
        )

    century_char = national_id[0]
    if century_char == "2":
        century_base = 1900
    elif century_char == "3":
        century_base = 2000
    else:
        raise ValidationError(
            f"Invalid century digit '{century_char}'. First digit must be '2' (1900-1999) or '3' (2000-2099).",
            code="invalid_century_digit",
        )

    yy = int(national_id[1:3])
    mm = int(national_id[3:5])
    dd = int(national_id[5:7])
    full_year = century_base + yy

    try:
        birth_date = datetime.date(year=full_year, month=mm, day=dd)
    except ValueError as exc:
        raise ValidationError(
            f"Invalid date of birth in National ID ({full_year}-{mm:02d}-{dd:02d}): {exc}",
            code="invalid_birth_date",
        ) from exc

    current_date = timezone.now().date()
    if birth_date > current_date:
        raise ValidationError(
            f"Birth date ({birth_date}) cannot be in the future.",
            code="future_birth_date",
        )

    gov_code = national_id[7:9]
    if gov_code not in EGYPTIAN_GOVERNORATE_CODES:
        raise ValidationError(
            f"Governorate code '{gov_code}' is not a recognized Egyptian governorate code.",
            code="invalid_governorate_code",
        )

    return birth_date


def validate_blood_pressure(systolic: int, diastolic: int) -> None:
    """
    Enforces clinical validity and domain invariants on blood pressure metrics:
    - Systolic in [50, 300]
    - Diastolic in [30, 200]
    - Invariant: systolic > diastolic
    """
    if systolic is None or diastolic is None:
        raise ValidationError(
            "Both baseline systolic and diastolic blood pressure must be provided.",
            code="missing_blood_pressure",
        )

    if not (50 <= systolic <= 300):
        raise ValidationError(
            f"Baseline systolic pressure must be between 50 and 300 mmHg. Received: {systolic}",
            code="invalid_systolic_range",
        )

    if not (30 <= diastolic <= 200):
        raise ValidationError(
            f"Baseline diastolic pressure must be between 30 and 200 mmHg. Received: {diastolic}",
            code="invalid_diastolic_range",
        )

    if systolic <= diastolic:
        raise ValidationError(
            f"Baseline systolic pressure ({systolic}) must be strictly greater than diastolic ({diastolic}).",
            code="invalid_blood_pressure_ratio",
        )


def validate_baseline_glucose(glucose: Decimal | None) -> None:
    """
    Validates baseline glucose concentration when provided.
    """
    if glucose is not None and glucose <= Decimal("0.00"):
        raise ValidationError(
            f"Baseline glucose must be strictly greater than zero. Received: {glucose}",
            code="invalid_glucose_value",
        )
