from fastapi import APIRouter, HTTPException, Depends, Query, Form, File, UploadFile
from typing import List, Optional
from datetime import datetime
from app.database import products_collection, users_collection  
from app.models.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.routes.auth import get_current_user
import re

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    """Tạo sản phẩm mới với validation giá"""
    # Kiểm tra quyền tạo sản phẩm (chỉ shop hoặc admin)
    if current_user.get("role") not in ["admin", "shop"]:
        raise HTTPException(
            status_code=403,
            detail="Không có quyền tạo sản phẩm"
        )
    
    try:
        print(f"📥 Nhận dữ liệu sản phẩm: {product.dict()}")
        
        # Validate: Giá bán phải cao hơn giá gốc (giá nhập hàng)
        if product.original_price and product.price:
            if product.price <= product.original_price:
                raise HTTPException(
                    status_code=400,
                    detail="Giá bán phải cao hơn giá gốc (giá nhập hàng)"
                )
        
        # Tạo sản phẩm mới
        new_product = {
            **product.dict(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        print(f"📋 Sản phẩm trước khi insert: {new_product}")
        
        result = products_collection.insert_one(new_product)
        print(f"✅ Insert thành công: {result.inserted_id}")
        
        # Lấy sản phẩm đã tạo từ database
        created_product = products_collection.find_one({"_id": result.inserted_id})
        if created_product:
            # Chuyển đổi ObjectId thành string
            created_product["id"] = str(created_product["_id"])
            del created_product["_id"]
            
            # Chuyển đổi datetime thành string
            if "created_at" in created_product and hasattr(created_product["created_at"], 'isoformat'):
                created_product["created_at"] = created_product["created_at"].isoformat()
            if "updated_at" in created_product and hasattr(created_product["updated_at"], 'isoformat'):
                created_product["updated_at"] = created_product["updated_at"].isoformat()
            
            print(f"📤 Sản phẩm trả về: {created_product}")
            return created_product
        else:
            raise HTTPException(status_code=500, detail="Không thể lấy sản phẩm đã tạo")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Lỗi khi tạo sản phẩm: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/", response_model=ProductListResponse)
async def get_products(
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang"),
    category: Optional[str] = Query(None, description="Lọc theo danh mục"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên"),
    min_price: Optional[float] = Query(None, ge=0, description="Giá tối thiểu"),
    max_price: Optional[float] = Query(None, ge=0, description="Giá tối đa"),
    featured: Optional[bool] = Query(None, description="Lọc sản phẩm nổi bật")
):
    """Lấy danh sách sản phẩm"""
    # Xây dựng filter
    filter_dict = {"is_active": True}
    
    if category:
        filter_dict["category"] = category
    
    if search:
        filter_dict["name"] = {"$regex": search, "$options": "i"}
    
    if min_price is not None or max_price is not None:
        price_filter = {}
        if min_price is not None:
            price_filter["$gte"] = min_price
        if max_price is not None:
            price_filter["$lte"] = max_price
        filter_dict["price"] = price_filter
    
    if featured is not None:
        filter_dict["is_featured"] = featured
    
    # Đếm tổng số sản phẩm
    total = products_collection.count_documents(filter_dict)
    
    # Lấy sản phẩm với phân trang
    skip = (page - 1) * limit
    products = list(products_collection.find(filter_dict)
                  .skip(skip)
                  .limit(limit)
                  .sort("created_at", -1))
    
    # Chuyển đổi ObjectId thành string
    for product in products:
        product["id"] = str(product["_id"])
        del product["_id"]
    
    return ProductListResponse(
        products=products,
        total=total,
        page=page,
        limit=limit
    )

@router.get("/search", response_model=ProductListResponse)
async def search_products(
    q: str = Query(..., description="Từ khóa tìm kiếm"),
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(20, ge=1, le=100, description="Số sản phẩm mỗi trang"),
    category: Optional[str] = Query(None, description="Lọc theo danh mục"),
    min_price: Optional[float] = Query(None, ge=0, description="Giá tối thiểu"),
    max_price: Optional[float] = Query(None, ge=0, description="Giá tối đa"),
    sort_by: str = Query("relevance", description="Sắp xếp theo: relevance, price_asc, price_desc, newest")
):
    """Tìm kiếm sản phẩm theo từ khóa"""
    try:
        # Xử lý encoding UTF-8 cho tiếng Việt
        import urllib.parse
        q_decoded = urllib.parse.unquote(q)
        print(f"🔍 Search request: q='{q_decoded}', page={page}, limit={limit}")
        
        # Tạo query tìm kiếm - chỉ tìm theo tên sản phẩm
        search_query = {
            "is_active": True,
            "name": {"$regex": q_decoded, "$options": "i"}
        }
        
        # Thêm filter theo category nếu có
        if category and category != "all":
            search_query["category"] = category
        
        # Thêm filter theo giá nếu có
        if min_price is not None or max_price is not None:
            price_filter = {}
            if min_price is not None:
                price_filter["$gte"] = min_price
            if max_price is not None:
                price_filter["$lte"] = max_price
            search_query["price"] = price_filter
        
        # Tính toán skip
        skip = (page - 1) * limit
        
        # Tạo sort query
        sort_query = []
        if sort_by == "price_asc":
            sort_query = [("price", 1)]
        elif sort_by == "price_desc":
            sort_query = [("price", -1)]
        elif sort_by == "newest":
            sort_query = [("created_at", -1)]
        else:  # relevance - sắp xếp theo tên khớp nhất
            sort_query = [("name", 1)]
        
        # Thực hiện tìm kiếm
        products_cursor = products_collection.find(search_query).sort(sort_query).skip(skip).limit(limit)
        products = list(products_cursor)
        
        # Đếm tổng số sản phẩm
        total_products = products_collection.count_documents(search_query)
        
        # Chuyển đổi ObjectId và datetime
        for product in products:
            product["id"] = str(product["_id"])
            del product["_id"]
            
            if "created_at" in product and hasattr(product["created_at"], 'isoformat'):
                product["created_at"] = product["created_at"].isoformat()
            if "updated_at" in product and hasattr(product["updated_at"], 'isoformat'):
                product["updated_at"] = product["updated_at"].isoformat()
        
        # Tính toán pagination
        total_pages = (total_products + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        return {
            "products": products,
            "total": total_products,
            "page": page,
            "limit": limit
        }
        
    except Exception as e:
        print(f"❌ Lỗi tìm kiếm sản phẩm: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm sản phẩm: {str(e)}")

@router.get("/search-all")
async def search_products_and_shops(
    q: str = Query(..., description="Từ khóa tìm kiếm"),
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(20, ge=1, le=100, description="Số kết quả mỗi trang")
):
    """Tìm kiếm cả sản phẩm và shop theo từ khóa"""
    try:
        import urllib.parse
        q_decoded = urllib.parse.unquote(q)
        print(f"🔍 Search all request: q='{q_decoded}', page={page}, limit={limit}")
        
        # Tìm kiếm sản phẩm
        products_query = {
            "is_active": True,
            "name": {"$regex": q_decoded, "$options": "i"}
        }
        
        # Tìm kiếm shop (users có role = "shop")
        shops_query = {
            "role": "shop",
            "username": {"$regex": q_decoded, "$options": "i"}
        }
        
        # Tính toán skip
        skip = (page - 1) * limit
        
        # Tìm kiếm sản phẩm
        products_cursor = products_collection.find(products_query).limit(limit // 2)
        products = list(products_cursor)
        
        # Tìm kiếm shop
        shops_cursor = users_collection.find(shops_query).limit(limit // 2)
        shops = list(shops_cursor)
        
        # Chuyển đổi ObjectId và datetime cho sản phẩm
        for product in products:
            product["id"] = str(product["_id"])
            del product["_id"]
            
            if "created_at" in product and hasattr(product["created_at"], 'isoformat'):
                product["created_at"] = product["created_at"].isoformat()
            if "updated_at" in product and hasattr(product["updated_at"], 'isoformat'):
                product["updated_at"] = product["updated_at"].isoformat()
        
        # Chuyển đổi ObjectId cho shop
        for shop in shops:
            shop["id"] = str(shop["_id"])
            del shop["_id"]
            
            # Ẩn thông tin nhạy cảm
            if "password" in shop:
                del shop["password"]
        
        # Đếm tổng số kết quả
        total_products = products_collection.count_documents(products_query)
        total_shops = users_collection.count_documents(shops_query)
        total_results = total_products + total_shops
        
        return {
            "products": products,
            "shops": shops,
            "total_products": total_products,
            "total_shops": total_shops,
            "total": total_results,
            "page": page,
            "limit": limit
        }
        
    except Exception as e:
        print(f"❌ Lỗi tìm kiếm tổng hợp: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm: {str(e)}")

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """Lấy thông tin sản phẩm theo ID"""
    from bson import ObjectId
    
    try:
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        product["id"] = str(product["_id"])
        del product["_id"]
        
        return product
    except Exception:
        raise HTTPException(status_code=400, detail="ID sản phẩm không hợp lệ")

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật sản phẩm với logic tự động tính toán giá và discount"""
    from bson import ObjectId
    
    # Kiểm tra quyền
    if current_user.get("role") not in ["admin", "shop"]:
        raise HTTPException(status_code=403, detail="Không có quyền cập nhật sản phẩm")
    
    try:
        # Lấy sản phẩm hiện tại
        existing_product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not existing_product:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        # Kiểm tra quyền sở hữu sản phẩm (shop chỉ có thể cập nhật sản phẩm của mình)
        if current_user.get("role") == "shop" and existing_product.get("shop_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Bạn chỉ có thể cập nhật sản phẩm của cửa hàng mình")
        
        # Cập nhật chỉ các trường được cung cấp
        update_data = {k: v for k, v in product_update.dict().items() if v is not None}
        
        # Logic validation và tính toán giá
        # Lấy giá trị từ update_data hoặc từ existing_product
        original_price = update_data.get("original_price") if "original_price" in update_data else existing_product.get("original_price")
        price = update_data.get("price") if "price" in update_data else existing_product.get("price")
        discount_percentage = update_data.get("discount_percentage") if "discount_percentage" in update_data else existing_product.get("discount_percentage")
        
        # Validate: Giá bán PHẢI cao hơn giá gốc (giá nhập hàng)
        if "price" in update_data and "original_price" in update_data:
            if update_data["price"] <= update_data["original_price"]:
                raise HTTPException(
                    status_code=400, 
                    detail="Giá bán phải cao hơn giá gốc (giá nhập hàng)"
                )
        
        # Validate: Nếu chỉ cập nhật price, kiểm tra với original_price hiện tại
        if "price" in update_data and "original_price" not in update_data:
            if original_price and update_data["price"] <= original_price:
                raise HTTPException(
                    status_code=400,
                    detail="Giá bán phải cao hơn giá gốc (giá nhập hàng)"
                )
        
        # Validate: Nếu chỉ cập nhật original_price, kiểm tra với price hiện tại
        if "original_price" in update_data and "price" not in update_data:
            if price and update_data["original_price"] >= price:
                raise HTTPException(
                    status_code=400,
                    detail="Giá gốc (giá nhập hàng) phải nhỏ hơn giá bán"
                )
        
        # Discount % được tính trên giá bán, không tự động tính từ giá gốc
        # Giá cuối cùng = price * (1 - discount_percentage / 100)
        # Không cần tự động tính discount từ original_price và price
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": update_data}
            )
        
        # Lấy sản phẩm đã cập nhật
        updated_product = products_collection.find_one({"_id": ObjectId(product_id)})
        updated_product["id"] = str(updated_product["_id"])
        del updated_product["_id"]
        
        return updated_product
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi cập nhật sản phẩm: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Lỗi cập nhật sản phẩm: {str(e)}")

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Xóa sản phẩm (soft delete)"""
    from bson import ObjectId
    
    # Kiểm tra quyền
    if current_user.get("role") not in ["admin", "shop"]:
        raise HTTPException(status_code=403, detail="Không có quyền xóa sản phẩm")
    
    try:
        # Lấy sản phẩm hiện tại để kiểm tra quyền sở hữu
        existing_product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not existing_product:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        # Kiểm tra quyền sở hữu sản phẩm (shop chỉ có thể xóa sản phẩm của mình)
        if current_user.get("role") == "shop" and existing_product.get("shop_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Bạn chỉ có thể xóa sản phẩm của cửa hàng mình")
        
        result = products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        return {"message": "Sản phẩm đã được xóa thành công"}
    except Exception:
        raise HTTPException(status_code=400, detail="ID sản phẩm không hợp lệ")

@router.put("/{product_id}/images")
async def update_product_images(
    product_id: str,
    images: List[str] = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật ảnh sản phẩm"""
    # Kiểm tra quyền cập nhật sản phẩm (chỉ shop hoặc admin)
    if current_user.get("role") not in ["admin", "shop"]:
        raise HTTPException(
            status_code=403,
            detail="Không có quyền cập nhật sản phẩm"
        )
    
    try:
        from bson import ObjectId
        
        # Kiểm tra sản phẩm có tồn tại không
        existing_product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not existing_product:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        # Kiểm tra quyền sở hữu (shop chỉ có thể cập nhật sản phẩm của mình)
        if current_user.get("role") == "shop" and existing_product.get("shop_id") != current_user.get("id"):
            raise HTTPException(
                status_code=403,
                detail="Bạn chỉ có thể cập nhật sản phẩm của shop mình"
            )
        
        # Cập nhật ảnh sản phẩm
        result = products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {
                "$set": {
                    "images": images,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        # Lấy sản phẩm đã cập nhật
        updated_product = products_collection.find_one({"_id": ObjectId(product_id)})
        updated_product["id"] = str(updated_product["_id"])
        del updated_product["_id"]
        
        return {
            "message": "Cập nhật ảnh sản phẩm thành công",
            "product": updated_product
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail="ID sản phẩm không hợp lệ")

@router.post("/{product_id}/add-image")
async def add_product_image(
    product_id: str,
    image_url: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Thêm ảnh vào sản phẩm"""
    # Kiểm tra quyền cập nhật sản phẩm (chỉ shop hoặc admin)
    if current_user.get("role") not in ["admin", "shop"]:
        raise HTTPException(
            status_code=403,
            detail="Không có quyền cập nhật sản phẩm"
        )
    
    try:
        from bson import ObjectId
        
        # Kiểm tra sản phẩm có tồn tại không
        existing_product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not existing_product:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        # Kiểm tra quyền sở hữu (shop chỉ có thể cập nhật sản phẩm của mình)
        if current_user.get("role") == "shop" and existing_product.get("shop_id") != current_user.get("id"):
            raise HTTPException(
                status_code=403,
                detail="Bạn chỉ có thể cập nhật sản phẩm của shop mình"
            )
        
        # Lấy danh sách ảnh hiện tại
        current_images = existing_product.get("images", [])
        
        # Thêm ảnh mới vào danh sách
        if image_url not in current_images:
            current_images.append(image_url)
        
        # Cập nhật ảnh sản phẩm
        result = products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {
                "$set": {
                    "images": current_images,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        
        # Lấy sản phẩm đã cập nhật
        updated_product = products_collection.find_one({"_id": ObjectId(product_id)})
        updated_product["id"] = str(updated_product["_id"])
        del updated_product["_id"]
        
        return {
            "message": "Thêm ảnh sản phẩm thành công",
            "product": updated_product
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail="Lỗi thêm ảnh sản phẩm")

@router.get("/shop/{shop_id}")
async def get_shop_profile(
    shop_id: str,
    page: int = Query(1, ge=1, description="Số trang"),
    limit: int = Query(20, ge=1, le=100, description="Số sản phẩm mỗi trang")
):
    """Lấy thông tin shop và sản phẩm của shop"""
    try:
        from bson import ObjectId
        
        # Lấy thông tin shop
        shop = users_collection.find_one({"_id": ObjectId(shop_id), "role": "shop"})
        if not shop:
            raise HTTPException(status_code=404, detail="Không tìm thấy shop")
        
        # Ẩn thông tin nhạy cảm
        shop["id"] = str(shop["_id"])
        del shop["_id"]
        if "password" in shop:
            del shop["password"]
        
        # Đảm bảo avatar được set đúng
        if "avatar" in shop and shop["avatar"]:
            # Nếu có avatar ở root level, copy vào profile
            if "profile" not in shop:
                shop["profile"] = {}
            shop["profile"]["avatar"] = shop["avatar"]
        elif "profile" in shop and "avatar" in shop["profile"] and shop["profile"]["avatar"]:
            # Nếu có avatar ở profile level, copy ra root level
            shop["avatar"] = shop["profile"]["avatar"]
        
        # Lấy sản phẩm của shop
        products_query = {
            "shop_id": shop_id,
            "is_active": True
        }
        
        # Tính toán skip
        skip = (page - 1) * limit
        
        # Lấy sản phẩm
        products_cursor = products_collection.find(products_query).sort([("created_at", -1)]).skip(skip).limit(limit)
        products = list(products_cursor)
        
        # Đếm tổng số sản phẩm
        total_products = products_collection.count_documents(products_query)
        
        # Chuyển đổi ObjectId và datetime cho sản phẩm
        for product in products:
            product["id"] = str(product["_id"])
            del product["_id"]
            
            if "created_at" in product and hasattr(product["created_at"], 'isoformat'):
                product["created_at"] = product["created_at"].isoformat()
            if "updated_at" in product and hasattr(product["updated_at"], 'isoformat'):
                product["updated_at"] = product["updated_at"].isoformat()
        
        # Tính toán pagination
        total_pages = (total_products + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        return {
            "shop": shop,
            "products": products,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_products,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev
            }
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"❌ Lỗi lấy thông tin shop: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin shop: {str(e)}")

