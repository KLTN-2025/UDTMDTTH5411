from fastapi import APIRouter, HTTPException
from app.database import users_collection
from app.schemas import UserCreate, UserResponse, UserRole, UserStatus
from passlib.context import CryptContext
from datetime import datetime
from typing import List

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate):
    """Tạo user mới"""
    try:
        # Kiểm tra email đã tồn tại chưa
        if users_collection.find_one({"email": user.email}):
            raise HTTPException(status_code=400, detail="Email đã tồn tại")
        
        # Kiểm tra username đã tồn tại chưa
        if users_collection.find_one({"username": user.username}):
            raise HTTPException(status_code=400, detail="Username đã tồn tại")
        
        # Hash mật khẩu
        hashed_pw = pwd_context.hash(user.password)
        
        # Xác định permissions dựa trên role
        permissions = []
        if user.role == UserRole.ADMIN:
            permissions = ["user:read", "user:write", "user:delete", "admin:full_access"]
        elif user.role == UserRole.SHOP:
            permissions = ["product:read", "product:write", "product:delete", "order:read", "order:write", "shop:manage"]
        elif user.role == UserRole.CUSTOMER:
            permissions = ["product:read", "order:read", "order:write", "cart:manage"]
        
        # Tạo user data
        new_user = {
            "username": user.username,
            "email": user.email,
            "passwordHash": hashed_pw,
            "phone": user.phone,
            "role": user.role.value,
            "permissions": permissions,
            "status": UserStatus.ACTIVE.value,
            "profile": user.profile.dict() if user.profile else None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        # Thêm vào database
        result = users_collection.insert_one(new_user)
        
        # Tạo response
        response_data = {
            "id": str(result.inserted_id),
            "username": new_user["username"],
            "email": new_user["email"],
            "phone": new_user["phone"],
            "role": new_user["role"],
            "permissions": new_user["permissions"],
            "status": new_user["status"],
            "profile": new_user["profile"],
            "createdAt": new_user["createdAt"],
            "updatedAt": new_user["updatedAt"]
        }
        
        return UserResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi tạo user: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/", response_model=List[UserResponse])
def get_users(skip: int = 0, limit: int = 100):
    """Lấy danh sách users"""
    try:
        users = list(users_collection.find().skip(skip).limit(limit))
        for user in users:
            user["id"] = str(user["_id"])
            user["createdAt"] = user.get("createdAt")
            user["updatedAt"] = user.get("updatedAt")
        return [UserResponse(**user) for user in users]
    except Exception as e:
        print(f"Lỗi khi lấy users: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/shops", response_model=List[UserResponse])
def get_shops(skip: int = 0, limit: int = 100):
    """Lấy danh sách shops (users có role shop)"""
    try:
        users = list(users_collection.find({"role": "shop"}).skip(skip).limit(limit))
        for user in users:
            user["id"] = str(user["_id"])
            user["createdAt"] = user.get("createdAt")
            user["updatedAt"] = user.get("updatedAt")
        return [UserResponse(**user) for user in users]
    except Exception as e:
        print(f"Lỗi khi lấy shops: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    """Lấy thông tin user theo ID"""
    try:
        from bson import ObjectId
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
        
        user["id"] = str(user["_id"])
        user["createdAt"] = user.get("createdAt")
        user["updatedAt"] = user.get("updatedAt")
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi lấy user: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{user_id}")
def update_user(user_id: str, user_update: dict):
    """Cập nhật user"""
    try:
        from bson import ObjectId
        # Chỉ cho phép cập nhật một số trường nhất định
        allowed_fields = ["status", "phone", "profile"]
        update_data = {k: v for k, v in user_update.items() if k in allowed_fields}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có dữ liệu để cập nhật")
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
        
        # Lấy user đã cập nhật
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})
        updated_user["id"] = str(updated_user["_id"])
        updated_user["createdAt"] = updated_user.get("createdAt")
        updated_user["updatedAt"] = updated_user.get("updatedAt")
        
        return UserResponse(**updated_user)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi cập nhật user: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{user_id}")
def delete_user(user_id: str):
    """Xóa user"""
    try:
        from bson import ObjectId
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
        return {"message": "Xóa user thành công"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi xóa user: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
