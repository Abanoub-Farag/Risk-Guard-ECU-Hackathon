from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from .serializers import UserRegistrationInputSerializer, UserOutputSerializer
from apps.common.services import user_create

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=UserRegistrationInputSerializer,
        responses={201: UserOutputSerializer},
        tags=["auth"],
        summary="Register a new user",
    )
    def post(self, request, *args, **kwargs):
        serializer = UserRegistrationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = user_create(**serializer.validated_data)
        
        output_serializer = UserOutputSerializer(user)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
