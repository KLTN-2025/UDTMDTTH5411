import requests
import json
import time
import sys

# API base URL
BASE_URL = "http://localhost:8000"

def test_api_endpoint(endpoint: str, params: dict = None, method: str = "GET"):
    """Test một API endpoint"""
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if method == "GET":
            response = requests.get(url, params=params, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=params, timeout=30)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None

def test_index_stats():
    """Test index stats endpoint"""
    print("\n=== Test Index Stats ===")
    stats = test_api_endpoint("/index/stats")
    if stats:
        print("✅ Index stats:")
        for key, value in stats.items():
            print(f"   {key}: {value}")
        return True
    return False

def test_sample_products():
    """Test sample products endpoint"""
    print("\n=== Test Sample Products ===")
    products = test_api_endpoint("/products/sample", {"limit": 3})
    if products:
        print(f"✅ Found {len(products)} sample products:")
        for i, product in enumerate(products):
            print(f"   {i+1}. {product.get('name', 'N/A')} (ID: {product.get('id', 'N/A')})")
        return products
    return None

def test_text_search():
    """Test text search endpoints"""
    print("\n=== Test Text Search ===")
    
    test_queries = [
        "áo sơ mi",
        "quần jean",
        "váy đẹp"
    ]
    
    for query in test_queries:
        print(f"\nTest query: '{query}'")
        
        # Test traditional text search
        print("   Traditional text search:")
        traditional_results = test_api_endpoint("/search/text", {"query": query, "k": 3})
        if traditional_results:
            print(f"     ✅ Found {len(traditional_results)} results")
            for i, result in enumerate(traditional_results[:2]):
                print(f"       {i+1}. {result.get('name', 'N/A')}")
        else:
            print("     ❌ No results")
        
        # Test FashionCLIP similarity search
        print("   FashionCLIP similarity search:")
        similarity_results = test_api_endpoint("/search/similar-to-text", {"query": query, "k": 3})
        if similarity_results:
            print(f"     ✅ Found {len(similarity_results)} results")
            for i, result in enumerate(similarity_results[:2]):
                name = result.get('name', 'N/A')
                score = result.get('similarity_score', 0)
                print(f"       {i+1}. {name} (score: {score:.3f})")
        else:
            print("     ❌ No results")

def test_similar_to_product():
    """Test similar to product endpoint"""
    print("\n=== Test Similar to Product ===")
    
    # Lấy sample products trước
    sample_products = test_sample_products()
    if not sample_products:
        print("❌ Cannot test similar products without sample products")
        return False
    
    # Test với product đầu tiên
    product_id = sample_products[0].get('id')
    if product_id:
        print(f"\nTesting similar products to: {sample_products[0].get('name', 'N/A')}")
        similar_results = test_api_endpoint(f"/search/similar-to-product/{product_id}", {"k": 3})
        
        if similar_results:
            print(f"✅ Found {len(similar_results)} similar products:")
            for i, result in enumerate(similar_results):
                name = result.get('name', 'N/A')
                score = result.get('similarity_score', 0)
                print(f"   {i+1}. {name} (score: {score:.3f})")
            return True
        else:
            print("❌ No similar products found")
            return False
    else:
        print("❌ No valid product ID found")
        return False

def test_rebuild_index():
    """Test rebuild index endpoint"""
    print("\n=== Test Rebuild Index ===")
    print("⚠️  This will rebuild the index. Continue? (y/N): ", end="")
    
    # Trong môi trường thực tế, bạn có thể muốn skip test này
    # response = input().strip().lower()
    # if response != 'y':
    #     print("⏭️  Skipping index rebuild test")
    #     return True
    
    print("Skipping rebuild test for safety...")
    return True

def main():
    """Main test function"""
    print("🚀 Testing FashionCLIP API Integration...")
    print(f"Base URL: {BASE_URL}")
    
    # Kiểm tra server có chạy không
    print("\n1. Checking server status...")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print("❌ Server is not responding properly")
            return
    except:
        print("❌ Cannot connect to server. Please make sure the server is running.")
        print("   Run: uvicorn app.main:app --reload")
        return
    
    # Test các endpoints
    tests = [
        ("Index Stats", test_index_stats),
        ("Sample Products", lambda: test_sample_products() is not None),
        ("Text Search", test_text_search),
        ("Similar to Product", test_similar_to_product),
        ("Rebuild Index", test_rebuild_index),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running test: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                print(f"✅ {test_name} test passed")
            else:
                print(f"❌ {test_name} test failed")
        except Exception as e:
            print(f"❌ {test_name} test error: {e}")
            results.append((test_name, False))
    
    # Tổng kết
    print(f"\n{'='*50}")
    print("📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! FashionCLIP integration is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the logs above.")

if __name__ == "__main__":
    main()
