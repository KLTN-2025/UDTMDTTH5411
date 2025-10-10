from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CartItem(BaseModel):
    product_id: str = Field(..., description="ID sản phẩm")
    quantity: int = Field(..., gt=0, description="Số lượng")
    price: float = Field(..., gt=0, description="Giá tại thời điểm thêm vào giỏ")

class CartBase(BaseModel):
    user_id: str = Field(..., description="ID người dùng")
    items: List[CartItem] = Field(default_factory=list, description="Danh sách sản phẩm")
    total_amount: float = Field(default=0.0, description="Tổng tiền")

class CartCreate(CartBase):
    pass

class CartUpdate(BaseModel):
    items: Optional[List[CartItem]] = None

class CartResponse(CartBase):
    id: str = Field(..., description="ID giỏ hàng")
    created_at: datetime = Field(..., description="Thời gian tạo")
    updated_at: datetime = Field(..., description="Thời gian cập nhật")
    
    class Config:
        from_attributes = True

class AddToCartRequest(BaseModel):
    product_id: str = Field(..., description="ID sản phẩm")
    quantity: int = Field(..., gt=0, description="Số lượng")
