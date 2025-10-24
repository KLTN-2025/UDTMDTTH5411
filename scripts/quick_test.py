#!/usr/bin/env python3
"""
Script test nhanh cho database nhỏ (18 sản phẩm)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.config import get_settings
from app.models.simple_database import SimpleMongoDBManager
from app.services.simple_search_engine import SimpleFashionSearchEngine
import logging

# Thiết lập logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def quick_test():
    """Test nhanh cho database nhỏ"""
    
    print("=" * 60)
    print("QUICK TEST CHO DATABASE NHO (18 SAN PHAM)")
    print("=" * 60)
    
    # Lấy cấu hình
    settings = get_settings()
    
    print(f"\nCAU HINH:")
    print(f"   Database: {settings.db_name}")
    print(f"   Collection: {settings.collection_name}")
    print(f"   Image field: {settings.image_field}")
    
    try:
        # Test 1: Kết nối database
        print(f"\n1. TEST KET NOI DATABASE...")
        db_manager = SimpleMongoDBManager(
            mongo_uri=settings.mongo_uri,
            db_name=settings.db_name,
            collection_name=settings.collection_name
        )
        
        if db_manager.client is None:
            print("   X KHONG THE KET NOI")
            return False
        
        print("   V KET NOI THANH CONG")
        
        # Test 2: Đếm sản phẩm
        print(f"\n2. DEM SAN PHAM...")
        total_docs = db_manager.collection.count_documents({})
        products_with_images = db_manager.get_products_with_images()
        
        print(f"   Tong so documents: {total_docs}")
        print(f"   San pham co images: {len(products_with_images)}")
        
        if len(products_with_images) == 0:
            print("   X KHONG CO SAN PHAM NAO CO IMAGES")
            return False
        
        # Test 3: Hiển thị mẫu sản phẩm
        print(f"\n3. MAU SAN PHAM:")
        sample_product = products_with_images[0]
        print(f"   ID: {sample_product.get('_id')}")
        print(f"   Name: {sample_product.get('name', 'N/A')}")
        print(f"   Price: {sample_product.get('price', 'N/A')}")
        print(f"   Images: {len(sample_product.get(settings.image_field, []))} anh")
        
        # Test 4: Test search engine
        print(f"\n4. TEST SEARCH ENGINE...")
        try:
            search_engine = SimpleFashionSearchEngine()
            print("   V KHOI TAO SEARCH ENGINE THANH CONG")
            
            # Test search với text
            print(f"\n5. TEST SEARCH TEXT...")
            text_results = search_engine.search_by_text("áo")
            print(f"   Tim thay {len(text_results)} san pham cho tu khoa 'ao'")
            
            if text_results:
                for i, result in enumerate(text_results[:2]):
                    print(f"   {i+1}. {result.get('name', 'N/A')} - {result.get('price', 'N/A')}")
            
        except Exception as e:
            print(f"   X LOI SEARCH ENGINE: {e}")
            return False
        
        # Test 5: Test API endpoints
        print(f"\n6. TEST API ENDPOINTS...")
        try:
            from app.api.endpoints import router
            print("   V API ENDPOINTS HOAT DONG")
        except Exception as e:
            print(f"   X LOI API: {e}")
        
        db_manager.close()
        
        print(f"\n" + "=" * 60)
        print("V TAT CA TEST THANH CONG!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\nX LOI: {e}")
        return False

def show_database_info():
    """Hiển thị thông tin chi tiết về database"""
    
    settings = get_settings()
    db_manager = SimpleMongoDBManager(
        mongo_uri=settings.mongo_uri,
        db_name=settings.db_name,
        collection_name=settings.collection_name
    )
    
    print(f"\nCHI TIET DATABASE:")
    print(f"   Database: {settings.db_name}")
    print(f"   Collection: {settings.collection_name}")
    
    # Lấy tất cả sản phẩm
    all_products = list(db_manager.collection.find({}))
    products_with_images = db_manager.get_products_with_images()
    
    print(f"\nTHONG KE:")
    print(f"   Tong so san pham: {len(all_products)}")
    print(f"   San pham co images: {len(products_with_images)}")
    print(f"   San pham khong co images: {len(all_products) - len(products_with_images)}")
    
    # Hiển thị danh sách sản phẩm
    print(f"\nDANH SACH SAN PHAM:")
    for i, product in enumerate(all_products, 1):
        name = product.get('name', 'N/A')
        price = product.get('price', 'N/A')
        has_images = len(product.get(settings.image_field, [])) > 0
        image_count = len(product.get(settings.image_field, []))
        
        status = f"({image_count} anh)" if has_images else "(khong co anh)"
        try:
            print(f"   {i:2d}. {name} - {price} {status}")
        except UnicodeEncodeError:
            # Xử lý lỗi encoding
            safe_name = name.encode('ascii', 'ignore').decode('ascii') or "Unknown"
            print(f"   {i:2d}. {safe_name} - {price} {status}")
    
    db_manager.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Quick test cho database nhỏ")
    parser.add_argument("--info", action="store_true", help="Hiển thị thông tin chi tiết database")
    args = parser.parse_args()
    
    if args.info:
        show_database_info()
    else:
        success = quick_test()
        if not success:
            sys.exit(1)
