from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.library import (
    CreateLibrarySnippetRequest,
    LibraryItemType,
    LibrarySnippet,
    UpdateLibrarySnippetRequest,
)
from app.services.library_service import LibraryService

router = APIRouter(prefix="/library", tags=["Career Library"])


@router.get("", response_model=list[LibrarySnippet])
def list_library_snippets(
    type: LibraryItemType | None = Query(default=None),
    tag: str | None = Query(default=None),
    query: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return LibraryService.list_snippets(db, item_type=type, tag=tag, query_text=query)


@router.post("", response_model=LibrarySnippet, status_code=status.HTTP_201_CREATED)
def create_library_snippet(
    request: CreateLibrarySnippetRequest,
    db: Session = Depends(get_db),
):
    return LibraryService.create_snippet(db, request)


@router.get("/{snippet_id}", response_model=LibrarySnippet)
def get_library_snippet(
    snippet_id: str,
    db: Session = Depends(get_db),
):
    return LibraryService.get_snippet(db, snippet_id)


@router.put("/{snippet_id}", response_model=LibrarySnippet)
def update_library_snippet(
    snippet_id: str,
    request: UpdateLibrarySnippetRequest,
    db: Session = Depends(get_db),
):
    return LibraryService.update_snippet(db, snippet_id, request)


@router.delete("/{snippet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_library_snippet(
    snippet_id: str,
    db: Session = Depends(get_db),
):
    LibraryService.delete_snippet(db, snippet_id)
