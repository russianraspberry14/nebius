from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.auth import create_access_token, hash_password, require_user, verify_password
from app.models import LoginRequest, SignupRequest, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenOut, status_code=201)
def signup(data: SignupRequest):
    if crud.email_taken(data.email):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = crud.create_user(data.email, hash_password(data.password))
    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginRequest):
    row = crud.get_user_by_email_with_hash(data.email)
    if row is None or not verify_password(data.password, row["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_access_token(row["id"])
    user = crud.get_user(row["id"])
    return TokenOut(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
def me(user_id: int = Depends(require_user)):
    user = crud.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return user
