"""Password hashing + JWT issuance/verification.

Standard FastAPI auth pattern: bcrypt for passwords (never store plaintext,
never roll your own hash), short-lived signed JWTs for sessions (stateless -
no server-side session table to manage). A Bearer token dependency
(require_user) gates every per-user route.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import JWT_ALGORITHM, JWT_EXPIRES_MINUTES, JWT_SECRET

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        # Malformed hash (shouldn't happen for rows we wrote ourselves).
        return False


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """Returns the user id encoded in a valid token, raises HTTPException(401) otherwise."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> int:
    """FastAPI dependency: returns the authenticated user's id, or 401s."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return decode_access_token(credentials.credentials)
