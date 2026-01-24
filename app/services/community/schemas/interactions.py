"""Interaction schemas (likes, collections) for community module."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .questions import QuestionListItem


class LikeCreate(BaseModel):
    """Request schema for creating a like."""

    target_type: Literal["question", "answer", "comment"]
    target_id: str


class LikeDelete(BaseModel):
    """Request schema for deleting a like."""

    target_type: Literal["question", "answer", "comment"]
    target_id: str


class LikeStatus(BaseModel):
    """Like status response."""

    is_liked: bool
    like_count: int


class CollectionCreate(BaseModel):
    """Request schema for creating a collection."""

    question_id: str
    folder_name: str | None = Field(None, max_length=50)
    note: str | None = Field(None, max_length=500)


class CollectionUpdate(BaseModel):
    """Request schema for updating a collection."""

    folder_name: str | None = Field(None, max_length=50)
    note: str | None = Field(None, max_length=500)


class CollectionItem(BaseModel):
    """Collection item response."""

    id: str
    question: QuestionListItem
    folder_name: str | None
    note: str | None
    created_at: datetime
