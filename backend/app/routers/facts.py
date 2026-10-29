from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.auth import require_user

router = APIRouter(tags=["facts"])


@router.delete("/facts/{fact_id}", status_code=204)
def delete_fact(fact_id: int, user_id: int = Depends(require_user)):
    if not crud.delete_fact(fact_id, user_id):
        raise HTTPException(status_code=404, detail="Fact not found")


@router.delete("/key-dates/{key_date_id}", status_code=204)
def delete_key_date(key_date_id: int, user_id: int = Depends(require_user)):
    if not crud.delete_key_date(key_date_id, user_id):
        raise HTTPException(status_code=404, detail="Key date not found")
