import os
import uuid
from pathlib import Path
from typing import BinaryIO
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from rest_framework import status
from apps.common.exceptions import ApplicationError

JPEG_MAGIC_BYTES = b"\xff\xd8\xff"
PNG_MAGIC_BYTES = b"\x89PNG\r\n\x1a\n"


def validate_image_file(uploaded_file: UploadedFile | BinaryIO) -> str:
    """
    Validates uploaded file against MIME type whitelist, file size limits,
    and binary magic byte signatures (preventing file extension spoofing).
    Returns normalized file extension ('jpg' or 'png').
    """
    max_size = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 10 * 1024 * 1024)
    file_size = getattr(uploaded_file, "size", None)

    if file_size is not None and file_size > max_size:
        raise ApplicationError(
            message=f"File size exceeds maximum allowable limit of {max_size // (1024 * 1024)}MB.",
            code="file_size_exceeded",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Read leading bytes to inspect magic signature
    pos = uploaded_file.tell() if hasattr(uploaded_file, "tell") else 0
    header = uploaded_file.read(8)
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(pos)

    if header.startswith(JPEG_MAGIC_BYTES):
        return "jpg"
    elif header.startswith(PNG_MAGIC_BYTES):
        return "png"
    else:
        raise ApplicationError(
            message="Unsupported or corrupted media format. Allowed types: JPEG, PNG.",
            code="unsupported_media_type",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )


class ObjectStorageService:
    """
    Sovereign object storage interface conforming to Egyptian data residency regulations.
    Generates structured, unguessable storage paths and persists device scans.
    """

    def __init__(self) -> None:
        self.region = getattr(settings, "STORAGE_SOVEREIGN_REGION", "eg-north-1")
        self.bucket = getattr(settings, "STORAGE_SOVEREIGN_BUCKET", "egypt-sovereign-health-records")
        self.media_root = Path(settings.MEDIA_ROOT)

    def generate_storage_uri(
        self,
        *,
        patient_id: uuid.UUID | str,
        refill_request_id: uuid.UUID | str,
        file_ext: str,
    ) -> tuple[str, str]:
        """
        Builds sovereign URI and target relative path:
        Pattern: scans/{patient_id}/{refill_request_id}/{random_uuid}.{ext}
        """
        scan_token = uuid.uuid4()
        rel_path = f"scans/{patient_id}/{refill_request_id}/{scan_token}.{file_ext}"
        storage_uri = f"sovereign://{self.bucket}/{self.region}/{rel_path}"
        return storage_uri, rel_path

    def store_file(
        self,
        *,
        patient_id: uuid.UUID | str,
        refill_request_id: uuid.UUID | str,
        uploaded_file: UploadedFile,
    ) -> str:
        """
        Validates binary header, generates sovereign URI, writes payload to persistent
        storage disk, and returns the formal storage URI.
        """
        file_ext = validate_image_file(uploaded_file)
        storage_uri, rel_path = self.generate_storage_uri(
            patient_id=patient_id,
            refill_request_id=refill_request_id,
            file_ext=file_ext,
        )

        dest_full_path = self.media_root / rel_path
        dest_full_path.parent.mkdir(parents=True, exist_ok=True)

        if hasattr(uploaded_file, "seek"):
            uploaded_file.seek(0)

        with open(dest_full_path, "wb") as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        return storage_uri
