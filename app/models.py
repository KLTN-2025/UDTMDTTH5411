from pydantic import BaseModel, EmailStr
from typing import List, Optional
from bson import ObjectId

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str
    permissions: List[str]

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    status: str
    
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None