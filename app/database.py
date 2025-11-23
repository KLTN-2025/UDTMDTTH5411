from pymongo import MongoClient
from app.config import settings

# Kết nối MongoDB
client = MongoClient(settings.MONGODB_URI)
db = client[settings.MONGODB_DB]

# Các collection trong database ecommerce
users_collection = db["users"]
products_collection = db["products"]
cart_collection = db["cart"]
orders_collection = db["orders"]
reviews_collection = db["reviews"]
categories_collection = db["categories"]
messages_collection = db["messages"]