from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    SHOP = "shop"
    CUSTOMER = "customer"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class Address(BaseModel):
    street: Optional[str] = Field(None, description="Địa chỉ đường")
    city: Optional[str] = Field(None, description="Thành phố")
    state: Optional[str] = Field(None, description="Tỉnh/Thành phố")
    zipCode: Optional[str] = Field(None, description="Mã bưu điện")
    country: Optional[str] = Field(None, description="Quốc gia")

class Profile(BaseModel):
    firstName: Optional[str] = Field(None, description="Tên")
    lastName: Optional[str] = Field(None, description="Họ")
    avatar: Optional[str] = Field(None, description="Ảnh đại diện")
    address: Optional[Address] = Field(None, description="Địa chỉ")
    dateOfBirth: Optional[str] = Field(None, description="Ngày sinh")
    gender: Optional[str] = Field(None, description="Giới tính")
    bio: Optional[str] = Field(None, description="Tiểu sử")

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Tên người dùng")
    email: EmailStr = Field(..., description="Địa chỉ email")
    phone: Optional[str] = Field(None, description="Số điện thoại")
    role: UserRole = Field(..., description="Vai trò người dùng")
    permissions: List[str] = Field(default_factory=list, description="Danh sách quyền")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="Trạng thái tài khoản")
    profile: Optional[Profile] = Field(None, description="Thông tin cá nhân")

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Tên người dùng")
    email: EmailStr = Field(..., description="Địa chỉ email")
    password: str = Field(..., min_length=6, max_length=100, description="Mật khẩu")
    phone: Optional[str] = Field(None, description="Số điện thoại")
    role: UserRole = Field(..., description="Vai trò người dùng")
    profile: Optional[Profile] = Field(None, description="Thông tin cá nhân")

class AdminCreate(UserCreate):
    role: UserRole = Field(default=UserRole.ADMIN, description="Vai trò admin")
    permissions: List[str] = Field(default=[
        "user:read", "user:write", "user:delete", "admin:full_access"
    ], description="Quyền admin")

class ShopCreate(UserCreate):
    role: UserRole = Field(default=UserRole.SHOP, description="Vai trò shop")
    permissions: List[str] = Field(default=[
        "product:read", "product:write", "product:delete",
        "order:read", "order:write", "shop:manage"
    ], description="Quyền shop")
    shopInfo: Optional[Dict[str, Any]] = Field(None, description="Thông tin shop")

class CustomerCreate(UserCreate):
    role: UserRole = Field(default=UserRole.CUSTOMER, description="Vai trò customer")
    permissions: List[str] = Field(default=[
        "product:read", "order:read", "order:write", "cart:manage"
    ], description="Quyền customer")

class UserResponse(BaseModel):
    id: str = Field(..., description="ID người dùng")
    username: str = Field(..., description="Tên người dùng")
    email: str = Field(..., description="Địa chỉ email")
    phone: Optional[str] = Field(None, description="Số điện thoại")
    role: UserRole = Field(..., description="Vai trò người dùng")
    permissions: List[str] = Field(..., description="Danh sách quyền")
    status: UserStatus = Field(..., description="Trạng thái tài khoản")
    profile: Optional[Profile] = Field(None, description="Thông tin cá nhân")
    createdAt: Optional[datetime] = Field(None, description="Thời gian tạo")
    updatedAt: Optional[datetime] = Field(None, description="Thời gian cập nhật")
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="Địa chỉ email")
    password: str = Field(..., description="Mật khẩu")

class Token(BaseModel):
    access_token: str = Field(..., description="Access token")
    token_type: str = Field(default="bearer", description="Loại token")
    expires_in: Optional[int] = Field(None, description="Thời gian hết hạn (giây)")

class LoginResponse(BaseModel):
    access_token: str = Field(..., description="Access token")
    token_type: str = Field(default="bearer", description="Loại token")
    expires_in: int = Field(..., description="Thời gian hết hạn (giây)")
    user: UserResponse = Field(..., description="Thông tin người dùng")

class TokenData(BaseModel):
    email: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Tên người dùng")
    phone: Optional[str] = Field(None, description="Số điện thoại")
    profile: Optional[Profile] = Field(None, description="Thông tin cá nhân")
    status: Optional[UserStatus] = Field(None, description="Trạng thái tài khoản")
