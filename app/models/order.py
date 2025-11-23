from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPING = "shipping"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class OrderItem(BaseModel):
    product_id: str = Field(..., description="ID sản phẩm")
    product_name: str = Field(..., description="Tên sản phẩm")
    quantity: int = Field(..., gt=0, description="Số lượng")
    price: float = Field(..., gt=0, description="Giá sản phẩm")
    shop_id: str = Field(..., description="ID cửa hàng")

class ShippingAddress(BaseModel):
    full_name: str = Field(..., description="Họ tên người nhận")
    phone: str = Field(..., description="Số điện thoại")
    address: str = Field(..., description="Địa chỉ")
    city: str = Field(..., description="Thành phố")
    district: str = Field(..., description="Quận/Huyện")
    ward: str = Field(..., description="Phường/Xã")

class OrderBase(BaseModel):
    user_id: str = Field(..., description="ID người dùng")
    items: List[OrderItem] = Field(..., description="Danh sách sản phẩm")
    shipping_address: ShippingAddress = Field(..., description="Địa chỉ giao hàng")
    total_amount: float = Field(..., gt=0, description="Tổng tiền")
    shipping_fee: float = Field(default=0.0, ge=0, description="Phí vận chuyển")
    status: OrderStatus = Field(default=OrderStatus.PENDING, description="Trạng thái đơn hàng")
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING, description="Trạng thái thanh toán")
    notes: Optional[str] = Field(None, description="Ghi chú")

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    notes: Optional[str] = None

class OrderResponse(OrderBase):
    id: str = Field(..., description="ID đơn hàng")
    order_number: str = Field(..., description="Mã đơn hàng")
    created_at: datetime = Field(..., description="Thời gian tạo")
    updated_at: datetime = Field(..., description="Thời gian cập nhật")
    
    class Config:
        from_attributes = True

class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    page: int
    limit: int
