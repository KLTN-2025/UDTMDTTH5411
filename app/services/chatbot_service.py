"""
Chatbot Service - Xử lý logic chatbot cho ecommerce
"""
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import google.generativeai as genai
from ..config import settings

class ChatbotService:
    def __init__(self):
        # Cấu hình Gemini API từ settings
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "your-gemini-api-key-here")
        genai.configure(api_key=api_key)
        
        # Khởi tạo model Gemini
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Hệ thống prompt cho ecommerce
        self.system_prompt = """
You are an intelligent AI assistant for a fashion ecommerce store.
Your tasks:
1. Answer questions about products, orders, policies
2. Help customers find suitable products
3. Advise on sizes, colors, styles
4. Explain return and shipping policies
5. Always be polite, friendly and helpful

Store information:
- Specializes in clothing and fashion accessories
- 30-day return policy
- Nationwide shipping
- 24/7 support
"""

    async def get_chat_response(
        self, 
        user_message: str, 
        conversation_history: List[Dict[str, str]] = None,
        product_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Xử lý tin nhắn từ người dùng và trả về phản hồi
        """
        try:
            # Chuẩn bị prompt cho Gemini
            full_prompt = self.system_prompt
            
            # Thêm lịch sử hội thoại nếu có
            if conversation_history:
                history_text = "\n".join([
                    f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
                    for msg in conversation_history[-10:]  # Giới hạn 10 tin nhắn gần nhất
                ])
                full_prompt += f"\n\nConversation history:\n{history_text}"
            
            # Thêm context sản phẩm nếu có
            if product_context:
                product_info = f"""
Current product information:
- Name: {product_context.get('name', 'N/A')}
- Price: {product_context.get('price', 'N/A')} VND
- Description: {product_context.get('description', 'N/A')}
- Category: {product_context.get('category', 'N/A')}
"""
                full_prompt += f"\n\n{product_info}"
            
            # Thêm tin nhắn hiện tại
            full_prompt += f"\n\nUser: {user_message}\nAssistant:"
            
            # Gọi Gemini API
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=500,
                    temperature=0.7,
                    top_p=0.9,
                )
            )
            
            bot_response = response.text
            
            return {
                "success": True,
                "message": bot_response,
                "timestamp": datetime.now().isoformat(),
                "model": "gemini-2.0-flash"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": "Sorry, I encountered a technical issue. Please try again later.",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def get_product_recommendations(
        self, 
        user_preferences: str,
        available_products: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Đưa ra gợi ý sản phẩm dựa trên sở thích người dùng
        """
        try:
            # Tạo prompt cho gợi ý sản phẩm
            prompt = f"""
{self.system_prompt}

Based on customer preferences: "{user_preferences}"

Please provide 3-5 product recommendations suitable for:
- Style: {user_preferences}
- Budget: Please ask the customer about their budget
- Size: Please ask the customer about their size

Provide specific and helpful advice.
"""
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=400,
                    temperature=0.8,
                )
            )
            
            recommendations = response.text
            
            return {
                "success": True,
                "recommendations": recommendations,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": "Unable to generate product recommendations",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def handle_faq(self, question: str) -> Dict[str, Any]:
        """
        Xử lý câu hỏi thường gặp
        """
        faq_responses = {
            "return": "We have a 30-day return policy. Products must be in original condition with tags intact.",
            "shipping": "We ship nationwide. Delivery time: 2-5 business days.",
            "payment": "We accept credit cards, bank transfers, and COD.",
            "size": "Please refer to the size guide on the product page. If you need assistance, contact our hotline.",
            "material": "Material information is clearly stated in the product description. For more details, contact us."
        }
        
        # Tìm kiếm từ khóa trong câu hỏi
        question_lower = question.lower()
        for keyword, answer in faq_responses.items():
            if keyword in question_lower:
                return {
                    "success": True,
                    "message": answer,
                    "type": "faq",
                    "timestamp": datetime.now().isoformat()
                }
        
        # Nếu không tìm thấy FAQ, trả về phản hồi chung
        return {
            "success": True,
            "message": "I don't fully understand your question. You can ask about products, orders, return policy, shipping, payment, etc.",
            "type": "general",
            "timestamp": datetime.now().isoformat()
        }

# Khởi tạo service
chatbot_service = ChatbotService()
