from fastapi import APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from app.database import users_collection
from app.config import settings
from app.schemas import (
    UserResponse, Token, TokenData, UserCreate, LoginResponse,
    AdminCreate, ShopCreate, CustomerCreate, UserRole, UserStatus
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = users_collection.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    return user

def get_default_permissions(role: UserRole) -> list:
    """Lấy danh sách quyền mặc định theo vai trò"""
    permissions_map = {
        UserRole.ADMIN: ["user:read", "user:write", "user:delete", "admin:full_access"],
        UserRole.SHOP: ["product:read", "product:write", "product:delete", "order:read", "order:write", "shop:manage"],
        UserRole.CUSTOMER: ["product:read", "order:read", "order:write", "cart:manage"]
    }
    return permissions_map.get(role, [])

@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    # Kiểm tra email đã tồn tại chưa
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được sử dụng"
        )
    
    # Kiểm tra username đã tồn tại chưa
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên người dùng đã được sử dụng"
        )
    
    # Mã hóa mật khẩu
    hashed_password = get_password_hash(user.password)
    
    # Lấy quyền mặc định theo vai trò
    permissions = get_default_permissions(user.role)
    
    # Tạo user mới
    new_user = {
        "username": user.username,
        "email": user.email,
        "passwordHash": hashed_password,
        "phone": user.phone,
        "role": user.role.value,
        "permissions": permissions,
        "status": UserStatus.ACTIVE.value,
        "profile": user.profile.dict() if user.profile else None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    # Lưu vào database
    result = users_collection.insert_one(new_user)
    new_user["id"] = str(result.inserted_id)
    
    # Xóa password hash khỏi response
    del new_user["passwordHash"]
    
    # Tạo response với đúng format
    user_response = {
        "id": new_user["id"],
        "username": new_user["username"],
        "email": new_user["email"],
        "phone": new_user.get("phone"),
        "role": new_user["role"],
        "permissions": new_user["permissions"],
        "status": new_user["status"],
        "profile": new_user.get("profile"),
        "createdAt": new_user["createdAt"],
        "updatedAt": new_user["updatedAt"]
    }
    
    return user_response

@router.post("/register/admin", response_model=UserResponse)
async def register_admin(admin: AdminCreate):
    """Đăng ký tài khoản admin"""
    admin.role = UserRole.ADMIN
    admin.permissions = get_default_permissions(UserRole.ADMIN)
    return await register_user(admin)

@router.post("/register/shop", response_model=UserResponse)
async def register_shop(shop: ShopCreate):
    """Đăng ký tài khoản shop"""
    shop.role = UserRole.SHOP
    shop.permissions = get_default_permissions(UserRole.SHOP)
    return await register_user(shop)

@router.post("/register/customer", response_model=UserResponse)
async def register_customer(customer: CustomerCreate):
    """Đăng ký tài khoản customer"""
    customer.role = UserRole.CUSTOMER
    customer.permissions = get_default_permissions(UserRole.CUSTOMER)
    return await register_user(customer)

@router.post("/login", response_model=LoginResponse)
async def login_user_endpoint(form_data: OAuth2PasswordRequestForm = Depends()):
    """Endpoint đăng nhập với response chi tiết hơn"""
    print(f"🔍 Login attempt for email: {form_data.username}")
    user = users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Kiểm tra trạng thái tài khoản
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản đã bị vô hiệu hóa"
        )
    
    # Tạo access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    # Trả về thông tin user và token
    user_response = {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "phone": user.get("phone"),
        "role": user["role"],
        "permissions": user["permissions"],
        "status": user["status"],
        "profile": user.get("profile"),
        "createdAt": user.get("createdAt"),
        "updatedAt": user.get("updatedAt")
    }
    
    print(f"✅ Login successful for user: {user['username']}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user_response
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Lấy thông tin user hiện tại"""
    # Xóa password hash khỏi response
    if "passwordHash" in current_user:
        del current_user["passwordHash"]
    
    # Tạo response với đúng format
    user_response = {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "phone": current_user.get("phone"),
        "role": current_user["role"],
        "permissions": current_user["permissions"],
        "status": current_user["status"],
        "profile": current_user.get("profile"),
        "createdAt": current_user.get("createdAt"),
        "updatedAt": current_user.get("updatedAt")
    }
    
    return user_response

# Admin routes để quản lý users
@router.get("/users", response_model=list[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Lấy danh sách tất cả users (chỉ admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền truy cập"
        )
    
    users = list(users_collection.find({}, {"passwordHash": 0}))
    return [{
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "phone": user.get("phone"),
        "role": user["role"],
        "permissions": user["permissions"],
        "status": user["status"],
        "profile": user.get("profile"),
        "createdAt": user.get("createdAt"),
        "updatedAt": user.get("updatedAt")
    } for user in users]

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, current_user: dict = Depends(get_current_user)):
    """Lấy thông tin user theo ID (chỉ admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền truy cập"
        )
    
    from bson import ObjectId
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)}, {"passwordHash": 0})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy user"
            )
        
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "phone": user.get("phone"),
            "role": user["role"],
            "permissions": user["permissions"],
            "status": user["status"],
            "profile": user.get("profile"),
            "createdAt": user.get("createdAt"),
            "updatedAt": user.get("updatedAt")
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID không hợp lệ"
        )

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str, 
    new_status: UserStatus, 
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật trạng thái user (chỉ admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền truy cập"
        )
    
    from bson import ObjectId
    try:
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": new_status.value, "updatedAt": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy user"
            )
        
        return {"message": f"Đã cập nhật trạng thái user thành {new_status.value}"}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID không hợp lệ"
        )

@router.put("/users/{user_id}")
async def update_user_profile(
    user_id: str,
    profile_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật thông tin profile của user"""
    try:
        from bson import ObjectId
        
        # Kiểm tra quyền (chỉ user đó hoặc admin)
        current_user_id = str(current_user.get("_id") or current_user.get("id", ""))
        if current_user.get("role") != "admin" and current_user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền cập nhật thông tin này"
            )
        
        # Kiểm tra user có tồn tại không
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
        
        # Cập nhật profile và phone
        update_data = {
            "updatedAt": datetime.utcnow()
        }
        
        # Cập nhật phone ở root level (shop và customer được cập nhật)
        if "phone" in profile_data and current_user.get("role") in ["shop", "customer"]:
            update_data["phone"] = profile_data["phone"]
        
        if "profile" in profile_data:
            update_data["profile"] = profile_data["profile"]
        
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # Lấy user đã cập nhật
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})
        if updated_user:
            updated_user["id"] = str(updated_user["_id"])
            del updated_user["_id"]
            if "password" in updated_user:
                del updated_user["password"]
        
        return {
            "message": "Cập nhật thông tin thành công",
            "user": updated_user
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Lỗi cập nhật profile: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật profile: {str(e)}")

@router.post("/users/{user_id}/avatar")
async def upload_user_avatar(
    user_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload ảnh đại diện cho user"""
    try:
        from bson import ObjectId
        import cloudinary
        import cloudinary.uploader
        from app.config import settings
        
        print(f"🔍 Upload avatar request - user_id: {user_id}")
        print(f"🔍 Current user: {current_user}")
        
        # Kiểm tra quyền (chỉ user đó hoặc admin)
        current_user_id = str(current_user.get("_id") or current_user.get("id", ""))
        print(f"🔍 Current user ID: {current_user_id}")
        
        if current_user.get("role") != "admin" and current_user_id != user_id:
            print(f"❌ Permission denied - role: {current_user.get('role')}, current_user_id: {current_user_id}, target_user_id: {user_id}")
            raise HTTPException(
                status_code=403,
                detail="Không có quyền thay đổi ảnh đại diện"
            )
        
        # Kiểm tra user có tồn tại không
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
        
        # Cấu hình Cloudinary
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET
        )
        
        # Kiểm tra file
        print(f"🔍 File info - name: {file.filename}, content_type: {file.content_type}")
        
        # Kiểm tra loại file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Chỉ được upload file ảnh")
        
        # Đọc nội dung file
        print(f"🔍 Reading file content...")
        file_content = await file.read()
        print(f"🔍 File size: {len(file_content)} bytes")
        
        # Kiểm tra kích thước file (max 5MB)
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Kích thước file không được vượt quá 5MB")
        
        # Upload ảnh lên Cloudinary
        print(f"🔍 Uploading to Cloudinary - folder: user_avatars, public_id: user_{user_id}_avatar")
        try:
            result = cloudinary.uploader.upload(
                file_content,
                folder="user_avatars",
                public_id=f"user_{user_id}_avatar",
                overwrite=True,
                resource_type="image"
            )
            avatar_url = result["secure_url"]
            print(f"✅ Cloudinary upload successful: {avatar_url}")
        except Exception as cloudinary_error:
            print(f"❌ Cloudinary upload failed: {str(cloudinary_error)}")
            raise HTTPException(status_code=500, detail=f"Lỗi upload lên Cloudinary: {str(cloudinary_error)}")
        
        # Cập nhật avatar trong database
        print(f"🔍 Updating database for user: {user_id}")
        
        # Lấy profile hiện tại
        current_profile = user.get("profile", {})
        current_profile["avatar"] = avatar_url
        
        # Cập nhật cả root avatar và profile.avatar
        update_result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "avatar": avatar_url,  # Root level avatar
                    "profile": current_profile,  # Profile level avatar
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        print(f"✅ Database update result: {update_result.modified_count} documents modified")
        
        return {
            "message": "Upload ảnh đại diện thành công",
            "avatar_url": avatar_url
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Lỗi upload avatar: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi upload avatar: {str(e)}")

@router.get("/test-auth")
async def test_auth(current_user: dict = Depends(get_current_user)):
    """Test endpoint để kiểm tra authentication"""
    return {
        "message": "Authentication working",
        "user_id": str(current_user.get("_id") or current_user.get("id", "")),
        "user_role": current_user.get("role"),
        "user_email": current_user.get("email")
    }

@router.post("/test-avatar/{user_id}")
async def test_avatar_update(user_id: str):
    """Test endpoint để cập nhật avatar trực tiếp"""
    try:
        from bson import ObjectId
        
        # Test URL
        test_avatar_url = "https://res.cloudinary.com/diy6zgu0f/image/upload/v1234567890/test_avatar.jpg"
        
        # Lấy user hiện tại
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
        
        # Lấy profile hiện tại
        current_profile = user.get("profile", {})
        current_profile["avatar"] = test_avatar_url
        
        # Cập nhật database
        update_result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "profile": current_profile,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        return {
            "message": "Test avatar update successful",
            "modified_count": update_result.modified_count,
            "avatar_url": test_avatar_url
        }
        
    except Exception as e:
        print(f"❌ Test avatar update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi test: {str(e)}")
