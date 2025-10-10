from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Tên sản phẩm")
    description: str = Field(..., description="Mô tả sản phẩm")
    price: float = Field(..., gt=0, description="Giá sản phẩm")
    original_price: Optional[float] = Field(None, gt=0, description="Giá gốc")
    category: str = Field(..., description="Danh mục sản phẩm")
    brand: Optional[str] = Field(None, description="Thương hiệu")
    size: Optional[str] = Field(None, description="Kích thước")
    color: Optional[str] = Field(None, description="Màu sắc")
    material: Optional[str] = Field(None, description="Chất liệu")
    images: List[str] = Field(default_factory=list, description="Danh sách hình ảnh")
    stock: int = Field(default=0, ge=0, description="Số lượng tồn kho")
    shop_id: str = Field(..., description="ID cửa hàng")
    is_active: bool = Field(default=True, description="Trạng thái hoạt động")
    is_featured: bool = Field(default=False, description="Sản phẩm nổi bật")
    is_new: bool = Field(default=False, description="Sản phẩm mới")
    discount_percentage: Optional[int] = Field(None, ge=0, le=100, description="Phần trăm giảm giá")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    original_price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_new: Optional[bool] = None
    discount_percentage: Optional[int] = Field(None, ge=0, le=100)

class ProductResponse(ProductBase):
    id: str = Field(..., description="ID sản phẩm")
    created_at: datetime = Field(..., description="Thời gian tạo")
    updated_at: datetime = Field(..., description="Thời gian cập nhật")
    
    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int
    limit: int
