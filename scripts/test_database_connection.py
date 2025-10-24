#!/usr/bin/env python3
"""
Script để kiểm tra kết nối database và cấu hình
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.config import get_settings
from app.models.simple_database import SimpleMongoDBManager
import logging

# Thiết lập logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Kiểm tra kết nối database và cấu hình"""
    
    # Lấy cấu hình
    settings = get_settings()
    
    print("=== CAU HINH DATABASE ===")
    print(f"MongoDB URI: {settings.mongo_uri}")
    print(f"Database Name: {settings.db_name}")
    print(f"Collection Name: {settings.collection_name}")
    print(f"Image Field: {settings.image_field}")
    print()
    
    try:
        # Tạo kết nối database
        db_manager = SimpleMongoDBManager(
            mongo_uri=settings.mongo_uri,
            db_name=settings.db_name,
            collection_name=settings.collection_name
        )
        
        if db_manager.client is None:
            print("X KHONG THE KET NOI DEN MONGODB")
            return False
        
        print("V KET NOI MONGODB THANH CONG")
        
        # Kiểm tra database và collection
        db_list = db_manager.client.list_database_names()
        if settings.db_name not in db_list:
            print(f"! Database '{settings.db_name}' khong ton tai")
            print(f"   Cac database co san: {db_list}")
        else:
            print(f"V Database '{settings.db_name}' ton tai")
        
        # Kiểm tra collection
        collection_list = db_manager.db.list_collection_names()
        if settings.collection_name not in collection_list:
            print(f"! Collection '{settings.collection_name}' khong ton tai")
            print(f"   Cac collection co san: {collection_list}")
        else:
            print(f"V Collection '{settings.collection_name}' ton tai")
            
            # Đếm số lượng documents
            total_docs = db_manager.collection.count_documents({})
            print(f"Tong so documents: {total_docs}")
            
            # Đếm số lượng products có images
            products_with_images = db_manager.get_products_with_images()
            print(f"So products co images: {len(products_with_images)}")
            
            # Hiển thị mẫu một document
            if products_with_images:
                sample_product = products_with_images[0]
                print(f"\nMAU DOCUMENT:")
                print(f"   ID: {sample_product.get('_id')}")
                print(f"   Name: {sample_product.get('name', 'N/A')}")
                print(f"   Price: {sample_product.get('price', 'N/A')}")
                print(f"   Images field '{settings.image_field}': {len(sample_product.get(settings.image_field, []))} images")
                
                # Hiển thị các fields có sẵn
                available_fields = list(sample_product.keys())
                print(f"   Available fields: {available_fields}")
        
        db_manager.close()
        return True
        
    except Exception as e:
        print(f"X LOI KET NOI: {e}")
        return False

if __name__ == "__main__":
    print("KIEM TRA CAU HINH DATABASE")
    print("=" * 50)
    
    success = test_database_connection()
    
    print("\n" + "=" * 50)
    if success:
        print("V KIEM TRA HOAN TAT")
    else:
        print("X CO LOI XAY RA")
        sys.exit(1)
