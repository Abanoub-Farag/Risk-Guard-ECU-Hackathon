import io
import uuid
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from apps.common.exceptions import ApplicationError
from apps.refills.storage import ObjectStorageService, validate_image_file


class TestStorageAndImageValidation:
    def test_valid_jpeg_magic_bytes(self) -> None:
        jpeg_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01" + b"\x00" * 100
        file = SimpleUploadedFile("scan.jpg", jpeg_content, content_type="image/jpeg")
        ext = validate_image_file(file)
        assert ext == "jpg"

    def test_valid_png_magic_bytes(self) -> None:
        png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 100
        file = SimpleUploadedFile("scan.png", png_content, content_type="image/png")
        ext = validate_image_file(file)
        assert ext == "png"

    def test_spoofed_extension_rejected_with_415(self) -> None:
        # Text file masquerading as .jpg
        fake_content = b"<html><body>Malicious Payload</body></html>"
        file = SimpleUploadedFile("spoofed.jpg", fake_content, content_type="image/jpeg")

        with pytest.raises(ApplicationError) as exc:
            validate_image_file(file)
        assert exc.value.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        assert exc.value.code == "unsupported_media_type"

    def test_executable_spoofed_as_png_rejected_with_415(self) -> None:
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"
        file = SimpleUploadedFile("danger.png", exe_content, content_type="image/png")

        with pytest.raises(ApplicationError) as exc:
            validate_image_file(file)
        assert exc.value.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    def test_oversized_file_rejected_with_400(self) -> None:
        large_size = 11 * 1024 * 1024  # 11 MB
        large_file = SimpleUploadedFile("large.jpg", b"", content_type="image/jpeg")
        large_file.size = large_size

        with pytest.raises(ApplicationError) as exc:
            validate_image_file(large_file)
        assert exc.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.value.code == "file_size_exceeded"

    def test_sovereign_uri_generation(self) -> None:
        service = ObjectStorageService()
        patient_id = uuid.uuid4()
        refill_id = uuid.uuid4()

        uri, rel_path = service.generate_storage_uri(
            patient_id=patient_id,
            refill_request_id=refill_id,
            file_ext="jpg",
        )

        assert uri.startswith(f"sovereign://{service.bucket}/{service.region}/scans/{patient_id}/{refill_id}/")
        assert uri.endswith(".jpg")
        assert rel_path.startswith(f"scans/{patient_id}/{refill_id}/")
        assert rel_path.endswith(".jpg")
