from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class OcrExtractionResult:
    """
    Standardized DTO representing biometric telemetry extracted by an OCR engine.
    """
    confidence_score: Decimal
    systolic: int | None = None
    diastolic: int | None = None
    glucose: Decimal | None = None
    raw_payload: dict[str, Any] = field(default_factory=dict)


class BaseOcrEngineClient(ABC):
    """
    Abstract interface decoupling optical character recognition providers from domain logic.
    """

    @abstractmethod
    def extract_telemetry(
        self,
        image_storage_uri: str,
        **kwargs: Any,
    ) -> OcrExtractionResult:
        """
        Extracts biometric telemetry from an image storage location.
        """
        raise NotImplementedError


class MockOcrEngineClient(BaseOcrEngineClient):
    """
    Deterministic client used for testing, staging, and local environments.
    """

    def __init__(
        self,
        default_result: OcrExtractionResult | None = None,
    ) -> None:
        self._default_result = default_result

    def extract_telemetry(
        self,
        image_storage_uri: str,
        **kwargs: Any,
    ) -> OcrExtractionResult:
        if self._default_result is not None:
            return self._default_result

        # Check for overrides passed in kwargs (e.g. from test setups)
        override_systolic = kwargs.get("systolic", 120)
        override_diastolic = kwargs.get("diastolic", 80)
        override_glucose = kwargs.get("glucose")
        override_confidence = kwargs.get("confidence_score", Decimal("0.9500"))
        override_payload = kwargs.get("raw_payload", {"provider": "mock", "uri": image_storage_uri})

        return OcrExtractionResult(
            confidence_score=Decimal(str(override_confidence)),
            systolic=int(override_systolic) if override_systolic is not None else None,
            diastolic=int(override_diastolic) if override_diastolic is not None else None,
            glucose=Decimal(str(override_glucose)) if override_glucose is not None else None,
            raw_payload=override_payload,
        )


def get_ocr_client() -> BaseOcrEngineClient:
    """
    Factory function providing the configured OCR engine client.
    """
    return MockOcrEngineClient()
