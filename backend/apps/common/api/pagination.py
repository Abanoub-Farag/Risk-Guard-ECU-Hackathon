from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response


class StandardLimitOffsetPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100

    def get_paginated_response(self, data: list) -> Response:
        return Response(
            {
                "count": self.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "limit": self.limit,
                "offset": self.offset,
                "results": data,
            }
        )
