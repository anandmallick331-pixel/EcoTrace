"""
FastAPI Router for Role-Based Authentication (/api/v1/auth).

Provides login, credential validation, and role verification for Official / Admin users.
"""

import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.enums import UserRole
from app.services.auth import (
    AuthService,
    get_current_user_info,
    get_current_user_role,
    require_official_or_admin,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])


class LoginRequest(BaseModel):
    username: Optional[str] = Field(None, description="Username or email address")
    password: Optional[str] = Field(None, description="Account password / passphrase")
    api_key: Optional[str] = Field(None, description="Official statutory API key")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    name: str
    email: Optional[str] = None
    organization: Optional[str] = None


class UserProfileResponse(BaseModel):
    username: str
    role: str
    name: str
    email: Optional[str] = None
    organization: Optional[str] = None
    is_authenticated: bool


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate Official or Admin user",
    description="Validates official credentials or API key and issues an EcoTrace session token.",
)
def login(payload: LoginRequest) -> LoginResponse:
    auth_result = None

    if payload.api_key:
        auth_result = AuthService.authenticate_by_api_key(payload.api_key)
    elif payload.username and payload.password:
        auth_result = AuthService.authenticate(payload.username, payload.password)
    
    if not auth_result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid official credentials or API key. Please check your username and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(
        "User %r authenticated successfully as %s",
        auth_result["username"],
        auth_result["role"],
    )
    return LoginResponse(**auth_result)


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get current user session profile and role",
)
def get_current_user(
    info: Annotated[dict, Depends(get_current_user_info)],
) -> UserProfileResponse:
    is_auth = info.get("role") in (UserRole.OFFICIAL.value, UserRole.ADMIN.value)
    return UserProfileResponse(
        username=info.get("username", "anonymous"),
        role=info.get("role", UserRole.PUBLIC.value),
        name=info.get("name", "Public Guest"),
        email=info.get("email"),
        organization=info.get("organization"),
        is_authenticated=is_auth,
    )


@router.post(
    "/logout",
    summary="Logout current session",
)
def logout() -> dict:
    return {"status": "logged_out", "message": "Session terminated successfully."}
