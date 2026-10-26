from fastapi import APIRouter, HTTPException

from app import crud

router = APIRouter(tags=["facts"])


@router.delete("/facts/{fact_id}", status_code=204)
def delete_fact(fact_id: int):
    if not crud.delete_fact(fact_id):
        raise HTTPException(status_code=404, detail="Fact not found")


@router.delete("/key-dates/{key_date_id}", status_code=204)
def delete_key_date(key_date_id: int):
    if not crud.delete_key_date(key_date_id):
        raise HTTPException(status_code=404, detail="Key date not found")
