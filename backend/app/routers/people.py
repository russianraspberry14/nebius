from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.auth import require_user
from app.models import (
    KeyDateCreate,
    KeyDateOut,
    PersonCreate,
    PersonDetail,
    PersonOut,
    PersonUpdate,
)

router = APIRouter(prefix="/people", tags=["people"])


@router.post("", response_model=PersonOut, status_code=201)
def create_person(data: PersonCreate, user_id: int = Depends(require_user)):
    return crud.create_person(user_id, data.name, data.relationship, data.home_city)


@router.get("", response_model=list[PersonOut])
def list_people(user_id: int = Depends(require_user)):
    return crud.list_people(user_id)


@router.get("/{person_id}", response_model=PersonDetail)
def get_person(person_id: int, user_id: int = Depends(require_user)):
    detail = crud.get_person_detail(person_id, user_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return detail


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(person_id: int, data: PersonUpdate, user_id: int = Depends(require_user)):
    if crud.get_person(person_id, user_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.update_person(person_id, user_id, data)


@router.delete("/{person_id}", status_code=204)
def delete_person(person_id: int, user_id: int = Depends(require_user)):
    if not crud.delete_person(person_id, user_id):
        raise HTTPException(status_code=404, detail="Person not found")


@router.post("/{person_id}/key-dates", response_model=KeyDateOut, status_code=201)
def create_key_date(person_id: int, data: KeyDateCreate, user_id: int = Depends(require_user)):
    if crud.get_person(person_id, user_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.create_key_date(person_id, data)


@router.get("/{person_id}/key-dates", response_model=list[KeyDateOut])
def list_key_dates(person_id: int, user_id: int = Depends(require_user)):
    if crud.get_person(person_id, user_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.list_key_dates(person_id)
