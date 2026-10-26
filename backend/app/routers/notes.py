from fastapi import APIRouter, HTTPException

from app import crud
from app.models import FactConfirmBatch, FactOut, NoteCaptureResult, NoteCreate, NoteOut
from app.nemotron import extract_facts

router = APIRouter(tags=["notes"])


@router.post("/people/{person_id}/notes", response_model=NoteCaptureResult, status_code=201)
def capture_note(person_id: int, data: NoteCreate):
    """Save the raw note, then run it through Nano for proposed facts.

    The note is saved immediately (it's the source of truth for citations);
    the proposed facts are NOT persisted here - the user accepts/edits/deletes
    each chip client-side, then POSTs the final set to /notes/{note_id}/facts.
    """
    if crud.get_person(person_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")

    note = crud.create_note(person_id, data.text)
    try:
        extraction = extract_facts(data.text)
    except ValueError as exc:
        # Note is already saved; the user can still confirm facts manually later.
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return NoteCaptureResult(note=note, proposed_facts=extraction.facts)


@router.get("/people/{person_id}/notes", response_model=list[NoteOut])
def list_notes(person_id: int):
    if crud.get_person(person_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.list_notes(person_id)


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    if not crud.delete_note(note_id):
        raise HTTPException(status_code=404, detail="Note not found")


@router.post("/notes/{note_id}/facts", response_model=list[FactOut], status_code=201)
def confirm_facts(note_id: int, batch: FactConfirmBatch):
    note = crud.get_note(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return crud.create_facts(note.person_id, note_id, batch.facts)
