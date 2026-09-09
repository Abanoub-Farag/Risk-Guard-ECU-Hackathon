import uuid
from typing import Any
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self) -> tuple[int, dict[str, int]]:
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self) -> tuple[int, dict[str, int]]:
        return super().delete()

    def alive(self) -> "SoftDeleteQuerySet":
        return self.filter(is_deleted=False)

    def dead(self) -> "SoftDeleteQuerySet":
        return self.filter(is_deleted=True)


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):  # type: ignore[misc]
    def get_queryset(self) -> SoftDeleteQuerySet:
        return super().get_queryset().filter(is_deleted=False)


class AllObjectsManager(models.Manager.from_queryset(SoftDeleteQuerySet)):  # type: ignore[misc]
    pass


class BaseModel(models.Model):
    """
    Abstract base model providing UUIDv4 primary keys,
    automatic timestamps, and soft-delete capabilities.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def delete(self, using: Any = None, keep_parents: bool = False) -> tuple[int, dict[str, int]]:
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        return 1, {self._meta.label: 1}

    def hard_delete(self, using: Any = None, keep_parents: bool = False) -> tuple[int, dict[str, int]]:
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self) -> None:
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
