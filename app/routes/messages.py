from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.message import MessageCreate, MessageResponse, ConversationResponse
from app.database import messages_collection, users_collection, products_collection
from app.routes.auth import get_current_user
from app.schemas import UserRole

router = APIRouter(prefix="/messages", tags=["Messages"])

def get_conversation_id(user_id: str, other_user_id: str) -> str:
    """Tạo conversation ID từ 2 user IDs (sắp xếp để đảm bảo unique)"""
    ids = sorted([user_id, other_user_id])
    return f"{ids[0]}_{ids[1]}"

@router.post("/", response_model=MessageResponse)
async def send_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Gửi tin nhắn giữa customer và shop"""
    try:
        # Kiểm tra quyền: chỉ customer và shop mới được chat
        if current_user.get("role") not in ["customer", "shop"]:
            raise HTTPException(
                status_code=403,
                detail="Chỉ customer và shop mới có thể chat"
            )
        
        # Kiểm tra sender_id phải là current_user
        if message.sender_id != current_user.get("id"):
            raise HTTPException(
                status_code=403,
                detail="Bạn chỉ có thể gửi tin nhắn với tư cách là chính mình"
            )
        
        # Kiểm tra receiver có tồn tại không
        try:
            receiver = users_collection.find_one({"_id": ObjectId(message.receiver_id)})
            if not receiver:
                raise HTTPException(status_code=404, detail="Người nhận không tồn tại")
            
            # Kiểm tra receiver phải là customer hoặc shop
            if receiver.get("role") not in ["customer", "shop"]:
                raise HTTPException(
                    status_code=400,
                    detail="Chỉ có thể chat với customer hoặc shop"
                )
            
            # Kiểm tra: customer chỉ chat với shop, shop chỉ chat với customer
            sender_role = current_user.get("role")
            receiver_role = receiver.get("role")
            
            if sender_role == receiver_role:
                raise HTTPException(
                    status_code=400,
                    detail="Customer chỉ có thể chat với shop và ngược lại"
                )
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=400, detail="ID người nhận không hợp lệ")
        
        # Kiểm tra product_id nếu có
        if message.product_id:
            try:
                product = products_collection.find_one({"_id": ObjectId(message.product_id)})
                if not product:
                    raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
                
                # Nếu có product_id, shop_id phải là shop của sản phẩm đó
                if message.shop_id and product.get("shop_id") != message.shop_id:
                    raise HTTPException(
                        status_code=400,
                        detail="Shop ID không khớp với sản phẩm"
                    )
                
                # Tự động set shop_id từ product nếu chưa có
                if not message.shop_id:
                    message.shop_id = product.get("shop_id")
                    
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise
                raise HTTPException(status_code=400, detail="ID sản phẩm không hợp lệ")
        
        # Tạo conversation_id
        conversation_id = get_conversation_id(message.sender_id, message.receiver_id)
        
        # Tạo message document
        new_message = {
            "sender_id": message.sender_id,
            "receiver_id": message.receiver_id,
            "content": message.content,
            "shop_id": message.shop_id,
            "product_id": message.product_id,
            "conversation_id": conversation_id,
            "read": False,
            "created_at": datetime.utcnow()
        }
        
        # Lưu vào database
        result = messages_collection.insert_one(new_message)
        new_message["id"] = str(result.inserted_id)
        new_message["created_at"] = new_message["created_at"]
        
        # Xóa _id và chuyển đổi
        del new_message["_id"]
        
        return new_message
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi gửi tin nhắn: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100)
):
    """Lấy danh sách conversations của user hiện tại"""
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Chưa đăng nhập")
        
        # Lấy tất cả conversations mà user tham gia
        conversations_query = {
            "$or": [
                {"sender_id": user_id},
                {"receiver_id": user_id}
            ]
        }
        
        # Lấy tin nhắn cuối cùng của mỗi conversation
        pipeline = [
            {"$match": conversations_query},
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$conversation_id",
                    "last_message": {"$first": "$$ROOT"},
                    "unread_count": {
                        "$sum": {
                            "$cond": [
                                {"$and": [
                                    {"$eq": ["$receiver_id", user_id]},
                                    {"$eq": ["$read", False]}
                                ]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {"$sort": {"last_message.created_at": -1}},
            {"$limit": limit}
        ]
        
        conversations_data = list(messages_collection.aggregate(pipeline))
        
        # Format response
        conversations = []
        for conv_data in conversations_data:
            last_msg = conv_data["last_message"]
            conversation_id = conv_data["_id"]
            
            # Xác định other_user_id
            if last_msg["sender_id"] == user_id:
                other_user_id = last_msg["receiver_id"]
            else:
                other_user_id = last_msg["sender_id"]
            
            # Lấy thông tin other_user
            try:
                other_user = users_collection.find_one({"_id": ObjectId(other_user_id)})
                if not other_user:
                    continue
                
                other_user_name = other_user.get("username", "Người dùng")
                profile = other_user.get("profile", {})
                if profile:
                    if profile.get("firstName") and profile.get("lastName"):
                        other_user_name = f"{profile['firstName']} {profile['lastName']}"
                    elif profile.get("shopName"):
                        other_user_name = profile["shopName"]
                
                other_user_role = other_user.get("role", "customer")
                
            except Exception:
                continue
            
            # Lấy thông tin sản phẩm nếu có
            product_name = None
            if last_msg.get("product_id"):
                try:
                    product = products_collection.find_one({"_id": ObjectId(last_msg["product_id"])})
                    if product:
                        product_name = product.get("name")
                except Exception:
                    pass
            
            conversations.append({
                "conversation_id": conversation_id,
                "other_user_id": other_user_id,
                "other_user_name": other_user_name,
                "other_user_role": other_user_role,
                "last_message": last_msg.get("content"),
                "last_message_time": last_msg.get("created_at"),
                "unread_count": conv_data["unread_count"],
                "product_id": last_msg.get("product_id"),
                "product_name": product_name
            })
        
        return conversations
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi lấy conversations: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/conversation/{other_user_id}", response_model=List[MessageResponse])
async def get_messages(
    other_user_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Lấy tin nhắn trong conversation với một user khác"""
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Chưa đăng nhập")
        
        # Tạo conversation_id
        conversation_id = get_conversation_id(user_id, other_user_id)
        
        # Lấy messages
        messages = list(
            messages_collection.find({"conversation_id": conversation_id})
            .sort("created_at", 1)
            .skip(skip)
            .limit(limit)
        )
        
        # Đánh dấu đã đọc cho messages nhận được
        messages_collection.update_many(
            {
                "conversation_id": conversation_id,
                "receiver_id": user_id,
                "read": False
            },
            {"$set": {"read": True}}
        )
        
        # Format response
        result = []
        for msg in messages:
            msg["id"] = str(msg["_id"])
            del msg["_id"]
            result.append(msg)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi lấy messages: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{message_id}/read")
async def mark_as_read(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Đánh dấu tin nhắn đã đọc"""
    try:
        user_id = current_user.get("id")
        
        # Kiểm tra message có tồn tại và user là receiver không
        message = messages_collection.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Tin nhắn không tồn tại")
        
        if message.get("receiver_id") != user_id:
            raise HTTPException(
                status_code=403,
                detail="Bạn chỉ có thể đánh dấu đã đọc tin nhắn của mình"
            )
        
        # Cập nhật
        messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"read": True}}
        )
        
        return {"success": True, "message": "Đã đánh dấu đã đọc"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi đánh dấu đã đọc: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Lấy số tin nhắn chưa đọc"""
    try:
        user_id = current_user.get("id")
        
        count = messages_collection.count_documents({
            "receiver_id": user_id,
            "read": False
        })
        
        return {"unread_count": count}
        
    except Exception as e:
        print(f"Lỗi khi lấy unread count: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

