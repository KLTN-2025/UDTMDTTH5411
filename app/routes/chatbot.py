"""
Chatbot API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from ..services.chatbot_service import chatbot_service
from ..auth import get_current_user

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    product_context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    success: bool
    message: str
    timestamp: str
    conversation_id: Optional[str] = None
    suggestions: Optional[List[str]] = None

class ProductRecommendationRequest(BaseModel):
    preferences: str
    budget: Optional[str] = None
    size: Optional[str] = None

class FAQRequest(BaseModel):
    question: str

# In-memory storage cho conversation (trong production nên dùng database)
conversations = {}

@router.post("/chat", response_model=ChatResponse)
async def chat_with_bot(
    chat_data: ChatMessage
):
    """
    Chat với bot AI
    """
    try:
        logger.info(f"Chat request: {chat_data.message}")
        
        # Lấy lịch sử hội thoại nếu có
        conversation_history = []
        if chat_data.conversation_id and chat_data.conversation_id in conversations:
            conversation_history = conversations[chat_data.conversation_id]
        
        # Gọi chatbot service
        response = await chatbot_service.get_chat_response(
            user_message=chat_data.message,
            conversation_history=conversation_history,
            product_context=chat_data.product_context
        )
        
        # Lưu lịch sử hội thoại
        if chat_data.conversation_id:
            if chat_data.conversation_id not in conversations:
                conversations[chat_data.conversation_id] = []
            
            conversations[chat_data.conversation_id].append({
                "role": "user",
                "content": chat_data.message,
                "timestamp": datetime.now().isoformat()
            })
            conversations[chat_data.conversation_id].append({
                "role": "assistant", 
                "content": response["message"],
                "timestamp": datetime.now().isoformat()
            })
        
        return ChatResponse(
            success=response["success"],
            message=response["message"],
            timestamp=response["timestamp"],
            conversation_id=chat_data.conversation_id
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý chat: {str(e)}")

@router.post("/recommendations")
async def get_product_recommendations(
    request: ProductRecommendationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Lấy gợi ý sản phẩm dựa trên sở thích
    """
    try:
        logger.info(f"Recommendation request from user {current_user.get('id')}")
        
        # Tạo prompt với thông tin đầy đủ
        full_preferences = f"""
Sở thích: {request.preferences}
Ngân sách: {request.budget or 'Chưa xác định'}
Kích thước: {request.size or 'Chưa xác định'}
"""
        
        response = await chatbot_service.get_product_recommendations(
            user_preferences=full_preferences
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo gợi ý: {str(e)}")

@router.post("/faq")
async def handle_faq(
    request: FAQRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Xử lý câu hỏi thường gặp
    """
    try:
        logger.info(f"FAQ request from user {current_user.get('id')}: {request.question}")
        
        response = await chatbot_service.handle_faq(request.question)
        
        return response
        
    except Exception as e:
        logger.error(f"FAQ error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý FAQ: {str(e)}")

@router.get("/conversation/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Lấy lịch sử hội thoại
    """
    try:
        if conversation_id not in conversations:
            return {"success": True, "messages": []}
        
        return {
            "success": True,
            "messages": conversations[conversation_id],
            "conversation_id": conversation_id
        }
        
    except Exception as e:
        logger.error(f"Get conversation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy lịch sử: {str(e)}")

@router.delete("/conversation/{conversation_id}")
async def clear_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Xóa lịch sử hội thoại
    """
    try:
        if conversation_id in conversations:
            del conversations[conversation_id]
        
        return {
            "success": True,
            "message": "Đã xóa lịch sử hội thoại"
        }
        
    except Exception as e:
        logger.error(f"Clear conversation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi xóa lịch sử: {str(e)}")

@router.get("/health")
async def chatbot_health():
    """
    Kiểm tra trạng thái chatbot service
    """
    return {
        "status": "healthy",
        "service": "chatbot",
        "timestamp": datetime.now().isoformat()
    }

@router.post("/test")
async def test_chatbot(chat_data: ChatMessage):
    """
    Test chatbot không cần authentication
    """
    try:
        logger.info(f"Test chat request: {chat_data.message}")
        
        # Gọi chatbot service
        response = await chatbot_service.get_chat_response(
            user_message=chat_data.message,
            conversation_history=[],
            product_context=chat_data.product_context
        )
        
        return ChatResponse(
            success=response["success"],
            message=response["message"],
            timestamp=response["timestamp"]
        )
        
    except Exception as e:
        logger.error(f"Test chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test chat error: {str(e)}")