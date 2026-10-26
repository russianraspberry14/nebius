from fastapi import APIRouter, HTTPException

from app import crud
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
def create_person(data: PersonCreate):
    return crud.create_person(data.name, data.relationship, data.home_city)


@router.get("", response_model=list[PersonOut])
def list_people():
    return crud.list_people()


@router.get("/{person_id}", response_model=PersonDetail)
def get_person(person_id: int):
    detail = crud.get_person_detail(person_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return detail


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(person_id: int, data: PersonUpdate):
    if crud.get_person(person_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.update_person(person_id, data)


@router.delete("/{person_id}", status_code=204)
def delete_person(person_id: int):
    if not crud.delete_person(person_id):
        raise HTTPException(status_code=404, detail="Person not found")


@router.post("/{person_id}/key-dates", response_model=KeyDateOut, status_code=201)
def create_key_date(person_id: int, data: KeyDateCreate):
    if crud.get_person(person_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.create_key_date(person_id, data)


@router.get("/{person_id}/key-dates", response_model=list[KeyDateOut])
def list_key_dates(person_id: int):
    if crud.get_person(person_id) is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return crud.list_key_dates(person_id)
