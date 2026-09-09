import datetime
from decimal import Decimal
import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.patients.validators import (
    validate_baseline_glucose,
    validate_blood_pressure,
    validate_egyptian_national_id,
)


class TestEgyptianNationalIDValidator:
    def test_valid_century_two_national_id(self) -> None:
        # Born 1985-10-15 in Cairo (01)
        valid_id = "28510150101234"
        birth_date = validate_egyptian_national_id(valid_id)
        assert birth_date == datetime.date(1985, 10, 15)

    def test_valid_century_three_national_id(self) -> None:
        # Born 2005-04-20 in Alexandria (02)
        valid_id = "30504200204567"
        birth_date = validate_egyptian_national_id(valid_id)
        assert birth_date == datetime.date(2005, 4, 20)

    def test_valid_leap_year_century_three(self) -> None:
        # 2000 was a leap year (century 3, YY=00, 2000-02-29 in Giza 21)
        valid_id = "30002292109876"
        birth_date = validate_egyptian_national_id(valid_id)
        assert birth_date == datetime.date(2000, 2, 29)

    def test_invalid_leap_year_century_two(self) -> None:
        # 1900 was NOT a leap year in Gregorian calendar (1900-02-29 is invalid)
        invalid_id = "20002290101234"
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id(invalid_id)
        assert "Invalid date of birth" in str(exc.value)

    def test_invalid_length(self) -> None:
        # Less than 14 digits
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("2851015010123")
        assert "must contain exactly 14 numeric digits" in str(exc.value)

        # More than 14 digits
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("285101501012345")
        assert "must contain exactly 14 numeric digits" in str(exc.value)

    def test_non_numeric_characters(self) -> None:
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("2851015010123A")
        assert "must contain exactly 14 numeric digits" in str(exc.value)

    def test_invalid_century_digit(self) -> None:
        # Century 1 (1800s) or 4 (2100s)
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("18510150101234")
        assert "Invalid century digit" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("48510150101234")
        assert "Invalid century digit" in str(exc.value)

    def test_invalid_month_and_day(self) -> None:
        # Month 13
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("28513150101234")
        assert "Invalid date of birth" in str(exc.value)

        # Day 32
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("28501320101234")
        assert "Invalid date of birth" in str(exc.value)

        # February 30
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("28502300101234")
        assert "Invalid date of birth" in str(exc.value)

    def test_future_birth_date(self) -> None:
        # Year 2095
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("39501010101234")
        assert "cannot be in the future" in str(exc.value)

    def test_invalid_governorate_code(self) -> None:
        # Code '00' or '99'
        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("28510150001234")
        assert "not a recognized Egyptian governorate code" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            validate_egyptian_national_id("28510159901234")
        assert "not a recognized Egyptian governorate code" in str(exc.value)


class TestBiometricsValidator:
    def test_valid_blood_pressure(self) -> None:
        validate_blood_pressure(120, 80)
        validate_blood_pressure(140, 90)
        validate_blood_pressure(50, 40)
        validate_blood_pressure(300, 200)

    def test_systolic_equal_or_less_than_diastolic(self) -> None:
        with pytest.raises(ValidationError) as exc:
            validate_blood_pressure(120, 120)
        assert "strictly greater than diastolic" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            validate_blood_pressure(80, 120)
        assert "strictly greater than diastolic" in str(exc.value)

    def test_systolic_out_of_range(self) -> None:
        with pytest.raises(ValidationError) as exc:
            validate_blood_pressure(49, 40)
        assert "between 50 and 300 mmHg" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            validate_blood_pressure(301, 80)
        assert "between 50 and 300 mmHg" in str(exc.value)

    def test_diastolic_out_of_range(self) -> None:
        with pytest.raises(ValidationError) as exc:
            validate_blood_pressure(120, 29)
        assert "between 30 and 200 mmHg" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            validate_blood_pressure(250, 201)
        assert "between 30 and 200 mmHg" in str(exc.value)

    def test_glucose_validation(self) -> None:
        validate_baseline_glucose(Decimal("95.50"))
        validate_baseline_glucose(None)

        with pytest.raises(ValidationError) as exc:
            validate_baseline_glucose(Decimal("0.00"))
        assert "strictly greater than zero" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            validate_baseline_glucose(Decimal("-5.00"))
        assert "strictly greater than zero" in str(exc.value)
