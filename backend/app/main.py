from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import users, auth, products, cart, orders, upload, reviews, categories
from app.database import client

app = FastAPI(
    title="Ecommerce Backend",
    description="API cho hệ thống thương mại điện tử",
    version="1.0.0"
)

# Cấu hình CORS để frontend có thể gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các router
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(upload.router)
app.include_router(reviews.router)
app.include_router(categories.router)

@app.on_event("startup")
async def startup_event():
    """Khởi tạo kết nối database khi ứng dụng khởi động"""
    try:
        # Test kết nối MongoDB
        client.admin.command('ping')
        print("✅ Kết nối MongoDB thành công!")
    except Exception as e:
        print(f"❌ Lỗi kết nối MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Đóng kết nối database khi ứng dụng tắt"""
    client.close()
    print("🔌 Đã đóng kết nối MongoDB")

@app.get("/")
def home():
    return {"message": "Ecommerce Backend is running"}

@app.get("/health")
def health_check():
    """Kiểm tra trạng thái sức khỏe của API và database"""
    try:
        # Test kết nối database
        client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "message": "Tất cả dịch vụ đang hoạt động bình thường"
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "database": "disconnected",
            "error": str(e)
        }
