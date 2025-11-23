from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "ecommerce"
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Cloudinary settings
    CLOUDINARY_CLOUD_NAME: str = "diy6zgu0f"
    CLOUDINARY_API_KEY: str = "791438346649772"
    CLOUDINARY_API_SECRET: str = "9CEPjRen509H5fe_Q6MpWhqBCq4"
    
    # Gemini AI settings cho chatbot
    GEMINI_API_KEY: Optional[str] = None
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Bỏ qua các biến môi trường không được định nghĩa

settings = Settings()
