from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class MessageBase(BaseModel):
    sender_id: str = Field(..., description="ID người gửi")
    receiver_id: str = Field(..., description="ID người nhận")
    content: str = Field(..., min_length=1, description="Nội dung tin nhắn")
    shop_id: Optional[str] = Field(None, description="ID shop (nếu chat về sản phẩm)")
    product_id: Optional[str] = Field(None, description="ID sản phẩm (nếu chat về sản phẩm cụ thể)")

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: str
    created_at: datetime
    read: bool = False
    
    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    conversation_id: str = Field(..., description="ID conversation (shop_id hoặc customer_id)")
    other_user_id: str = Field(..., description="ID người còn lại trong conversation")
    other_user_name: str = Field(..., description="Tên người còn lại")
    other_user_role: str = Field(..., description="Role của người còn lại")
    last_message: Optional[str] = Field(None, description="Tin nhắn cuối cùng")
    last_message_time: Optional[datetime] = Field(None, description="Thời gian tin nhắn cuối")
    unread_count: int = Field(0, description="Số tin nhắn chưa đọc")
    product_id: Optional[str] = Field(None, description="ID sản phẩm nếu có")
    product_name: Optional[str] = Field(None, description="Tên sản phẩm nếu có")

