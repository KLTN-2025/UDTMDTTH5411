from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from app.database import categories_collection, products_collection
from app.routes.auth import get_current_user
from fastapi import UploadFile, File
import cloudinary
import cloudinary.uploader
from app.config import settings


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        try:
            return ObjectId(str(v))
        except Exception:
            raise ValueError("Invalid ObjectId")


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True
    image_url: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    slug: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None
    image_url: Optional[str] = None


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: Optional[str]
    description: Optional[str]
    is_active: bool
    image_url: Optional[str]
    created_at: datetime
    updated_at: datetime


router = APIRouter(prefix="/categories", tags=["categories"])


def serialize_category(doc: dict) -> CategoryOut:
    return CategoryOut(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        slug=doc.get("slug"),
        description=doc.get("description"),
        is_active=doc.get("is_active", True),
        image_url=doc.get("image_url"),
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at", datetime.utcnow()),
    )


@router.post("/", response_model=CategoryOut)
def create_category(payload: CategoryCreate, current_user: dict = Depends(get_current_user)):
    # Chỉ admin mới được tạo danh mục
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền tạo danh mục")

    # Kiểm tra trùng tên
    if categories_collection.find_one({"name": payload.name}):
        raise HTTPException(status_code=400, detail="Danh mục đã tồn tại")

    doc = {
        "name": payload.name,
        "slug": payload.slug,
        "description": payload.description,
        "is_active": payload.is_active,
        "image_url": payload.image_url,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = categories_collection.insert_one(doc)
    created = categories_collection.find_one({"_id": result.inserted_id})
    return serialize_category(created)


@router.get("/", response_model=List[CategoryOut])
def list_categories(q: Optional[str] = Query(default=None), only_active: bool = True):
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if only_active:
        query["is_active"] = True

    docs = categories_collection.find(query).sort("name", 1)
    return [serialize_category(d) for d in docs]


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: str):
    try:
        doc = categories_collection.find_one({"_id": ObjectId(category_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
        return serialize_category(doc)
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    propagate_products: bool = Query(default=False),
    current_user: dict = Depends(get_current_user),
):
    # Chỉ admin mới được cập nhật danh mục
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền cập nhật danh mục")

    try:
        doc = categories_collection.find_one({"_id": ObjectId(category_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")

        update_fields = {k: v for k, v in payload.dict(exclude_unset=True).items()}
        update_fields["updated_at"] = datetime.utcnow()

        categories_collection.update_one({"_id": ObjectId(category_id)}, {"$set": update_fields})

        # Nếu đổi tên danh mục và muốn propagate sang products
        if propagate_products and "name" in update_fields:
            products_collection.update_many(
                {"category": doc.get("name")},
                {"$set": {"category": update_fields["name"]}}
            )

        updated = categories_collection.find_one({"_id": ObjectId(category_id)})
        return serialize_category(updated)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")


@router.delete("/{category_id}")
def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    # Chỉ admin mới được xóa danh mục
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền xóa danh mục")

    try:
        doc = categories_collection.find_one({"_id": ObjectId(category_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")

        # Nếu danh mục đang được dùng bởi products, từ chối xóa (hoặc có thể soft-delete)
        in_use = products_collection.count_documents({"category": doc.get("name")})
        if in_use > 0:
            raise HTTPException(status_code=409, detail="Danh mục đang được sử dụng bởi sản phẩm")

        categories_collection.delete_one({"_id": ObjectId(category_id)})
        return {"message": "Đã xóa danh mục"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")


@router.post("/{category_id}/image", response_model=CategoryOut)
async def upload_category_image(
    category_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Chỉ admin mới được upload ảnh danh mục
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền")

    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File không phải hình ảnh")

    try:
        doc = categories_collection.find_one({"_id": ObjectId(category_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET
        )
        upload_result = cloudinary.uploader.upload(
            await file.read(),
            folder="category_images",
            resource_type="image"
        )
        image_url = upload_result.get("secure_url")

        categories_collection.update_one(
            {"_id": ObjectId(category_id)},
            {"$set": {"image_url": image_url, "updated_at": datetime.utcnow()}}
        )
        updated = categories_collection.find_one({"_id": ObjectId(category_id)})
        return serialize_category(updated)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload ảnh danh mục: {str(e)}")


