import math

from app.schemas.base import APIModel


class PageMeta(APIModel):
    page: int
    page_size: int
    total: int
    page_count: int

    @classmethod
    def from_total(cls, *, page: int, page_size: int, total: int) -> "PageMeta":
        return cls(
            page=page,
            page_size=page_size,
            total=total,
            page_count=math.ceil(total / page_size) if total else 0,
        )


class PageResponse[ItemT](APIModel):
    items: list[ItemT]
    meta: PageMeta
