from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status
from apps.common.exceptions import ApplicationError

@transaction.atomic
def user_create(*, username: str, password: str, email: str = '', first_name: str = '', last_name: str = '') -> User:
    if User.objects.filter(username=username).exists():
        raise ApplicationError(
            message="A user with this username already exists.",
            code="user_username_conflict",
            status_code=status.HTTP_409_CONFLICT,
        )
    user = User.objects.create(username=username, email=email, first_name=first_name, last_name=last_name)
    user.set_password(password)
    user.save()
    return user
