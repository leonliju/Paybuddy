from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_connection
from auth import hash_password, create_token

router = APIRouter()

DEFAULT_CATEGORIES = [
    'Food','Travel','Bills','Shopping',
    'Education','Medical','Entertainment','Income','Other'
]

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(req: RegisterRequest):
    con = get_connection()
    try:
        existing = con.execute(
            "SELECT user_id FROM users WHERE username = ?",
            [req.username]
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

        con.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [req.username, hash_password(req.password)]
        )
        user = con.execute(
            "SELECT user_id FROM users WHERE username = ?",
            [req.username]
        ).fetchone()
        user_id = user[0]

        for cat in DEFAULT_CATEGORIES:
            con.execute(
                "INSERT OR IGNORE INTO categories (user_id, name, is_default) VALUES (?, ?, 1)",
                [user_id, cat]
            )

        token = create_token(user_id, req.username)
        return {"token": token, "user_id": user_id, "username": req.username}
    finally:
        con.close()

@router.post("/login")
def login(req: LoginRequest):
    con = get_connection()
    try:
        user = con.execute(
            "SELECT user_id, username, password_hash FROM users WHERE username = ?",
            [req.username]
        ).fetchone()
        if not user or user[2] != hash_password(req.password):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        token = create_token(user[0], user[1])
        return {"token": token, "user_id": user[0], "username": user[1]}
    finally:
        con.close()