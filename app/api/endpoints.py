from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.services.simple_search_engine import SimpleFashionSearchEngine
from app.utils.config import get_settings
from bson import ObjectId
from typing import Dict, Any

router = APIRouter()
settings = get_settings()

try:
    from app.services.search_engine import FashionSearchEngine
    search_engine = FashionSearchEngine()
except Exception:
    search_engine = SimpleFashionSearchEngine()

class ProductResponse(BaseModel):
    id: str
    name: str
    price: float
    images: List[str]
    similarity_score: float
    distance: float
    description: Optional[str] = None

    class Config:
        json_encoders = {
            ObjectId: str
        }

@router.post("/search/similar-to-image/upload", response_model=List[ProductResponse])
async def search_similar_to_image_upload(file: UploadFile = File(...), k: int = 5):
    """
    Tìm kiếm sản phẩm tương tự từ file ảnh upload sử dụng FashionCLIP.
    
    - **file**: File ảnh (jpg, jpeg, png)
    - **k**: Số lượng sản phẩm tương tự cần trả về (mặc định: 5)
    
    FashionCLIP sẽ phân tích ảnh và tìm các sản phẩm có style/tính chất tương tự.
    """
    try:
        # Kiểm tra file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File phải là hình ảnh")
        
        # Đọc toàn bộ bytes của file upload
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="File ảnh trống")

        # Sử dụng FashionCLIP để tìm kiếm
        results = search_engine.search_similar_products_from_bytes(image_bytes, k)

        response = []
        for product in results:
            response.append(ProductResponse(
                id=str(product["_id"]),
                name=product.get("name", ""),
                price=product.get("sale_price", 0),
                images=product.get("images", []),
                similarity_score=product.get("similarity_score", 0),
                distance=product.get("distance", 0),
                description=product.get("description", "")
            ))
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search/similar-to-image/url", response_model=List[ProductResponse])
async def search_similar_to_image_url(image_url: str, k: int = 5):
    """
    Tìm kiếm sản phẩm tương tự từ URL ảnh sử dụng FashionCLIP.
    
    - **image_url**: URL của ảnh cần tìm kiếm
    - **k**: Số lượng sản phẩm tương tự cần trả về (mặc định: 5)
    
    FashionCLIP sẽ tải ảnh từ URL và tìm các sản phẩm có style/tính chất tương tự.
    """
    try:
        if not image_url:
            raise HTTPException(status_code=400, detail="URL ảnh không được để trống")

        # Sử dụng FashionCLIP để tìm kiếm từ URL
        results = search_engine.search_similar_products(image_url, k)

        response = []
        for product in results:
            response.append(ProductResponse(
                id=str(product["_id"]),
                name=product.get("name", ""),
                price=product.get("sale_price", 0),
                images=product.get("images", []),
                similarity_score=product.get("similarity_score", 0),
                distance=product.get("distance", 0),
                description=product.get("description", "")
            ))
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/similar-to-product/{product_id}", response_model=List[ProductResponse])
async def search_similar_to_product(
    product_id: str, 
    k: int = Query(5, description="Number of similar products to return")
):
    """Search for products similar to a specific product"""
    try:
        results = search_engine.search_similar_to_product(product_id, k)
        
        # Convert to response model
        response = []
        for product in results:
            response.append(ProductResponse(
                id=str(product["_id"]),
                name=product.get("name", ""),
                price=product.get("sale_price", 0),
                images=product.get("images", []),
                similarity_score=product.get("similarity_score", 0),
                distance=product.get("distance", 0),
                description=product.get("description", "")
            ))
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/index/rebuild")
async def rebuild_index(force: bool = False):
    """Rebuild the vector index from database"""
    try:
        try:
            search_engine.build_index(index_path=settings.index_path, force_rebuild=force)
        except TypeError:
            search_engine.build_index(index_path=settings.index_path, force=force)
        stats = search_engine.get_index_stats()
        return {"message": "Index rebuilt successfully", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/index/stats")
async def get_index_stats():
    """Get statistics about the current index"""
    try:
        stats = search_engine.get_index_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/sample")
async def get_sample_products(limit: int = Query(5, description="Number of sample products to return")):
    """Get sample products with images for testing"""
    try:
        products = search_engine.get_sample_products(limit)
        
        response = []
        for product in products:
            response.append({
                "id": str(product["_id"]),
                "name": product.get("name", ""),
                "price": product.get("sale_price", 0),
                "images": product.get("images", []),
                "description": product.get("description", "")
            })
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/similar-to-text", response_model=List[ProductResponse])
async def search_similar_to_text(
    query: str = Query(..., description="Text query to search for similar products"),
    k: int = Query(5, description="Number of similar products to return")
):
    """Tìm kiếm sản phẩm tương tự bằng text query sử dụng FashionCLIP"""
    try:
        results = search_engine.search_similar_products_by_text(query, k)
        
        response = []
        for product in results:
            response.append(ProductResponse(
                id=str(product["_id"]),
                name=product.get("name", ""),
                price=product.get("sale_price", 0),
                images=product.get("images", []),
                similarity_score=product.get("similarity_score", 0),
                distance=product.get("distance", 0),
                description=product.get("description", "")
            ))
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/text", response_model=List[Dict[str, Any]])
async def search_by_text(
    query: str = Query(..., description="Text query to search in product names/descriptions"),
    k: int = Query(5, description="Number of products to return")
):
    """Tìm kiếm sản phẩm bằng text trong tên/mô tả (traditional search)"""
    try:
        results = search_engine.search_products_by_text(query, k)
        
        response = []
        for product in results:
            response.append({
                "id": str(product["_id"]),
                "name": product.get("name", ""),
                "price": product.get("sale_price", 0),
                "images": product.get("images", []),
                "description": product.get("description", "")
            })
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))