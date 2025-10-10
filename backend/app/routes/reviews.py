from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import reviews_collection, orders_collection, products_collection

router = APIRouter(prefix="/reviews", tags=["Reviews"])

def convert_review_for_response(review):
    """Chuyển đổi review từ MongoDB thành format JSON-safe"""
    if review is None:
        return None
    
    # Chuyển đổi ObjectId thành string
    if "_id" in review:
        review["id"] = str(review["_id"])
        del review["_id"]
    
    # Chuyển đổi datetime thành string
    if "created_at" in review and hasattr(review["created_at"], 'isoformat'):
        review["created_at"] = review["created_at"].isoformat()
    if "updated_at" in review and hasattr(review["updated_at"], 'isoformat'):
        review["updated_at"] = review["updated_at"].isoformat()
    
    return review

@router.post("/")
async def create_review(review_data: dict):
    """Tạo đánh giá mới cho sản phẩm"""
    try:
        # Kiểm tra dữ liệu đầu vào
        required_fields = ["order_id", "product_id", "customer_id", "rating", "comment"]
        for field in required_fields:
            if field not in review_data:
                raise HTTPException(status_code=400, detail=f"Thiếu trường bắt buộc: {field}")
        
        order_id = review_data["order_id"]
        product_id = review_data["product_id"]
        customer_id = review_data["customer_id"]
        rating = review_data["rating"]
        comment = review_data["comment"]
        
        # Kiểm tra rating hợp lệ
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Đánh giá phải là số từ 1 đến 5")
        
        # Kiểm tra đơn hàng có tồn tại và đã được giao chưa
        order = orders_collection.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        if order["status"] != "delivered":
            raise HTTPException(status_code=400, detail="Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao")
        
        # Kiểm tra sản phẩm có trong đơn hàng không
        product_in_order = False
        for item in order["items"]:
            if item["product_id"] == product_id:
                product_in_order = True
                break
        
        if not product_in_order:
            raise HTTPException(status_code=400, detail="Sản phẩm không có trong đơn hàng này")
        
        # Kiểm tra đã đánh giá chưa
        existing_review = reviews_collection.find_one({
            "order_id": order_id,
            "product_id": product_id,
            "customer_id": customer_id
        })
        
        if existing_review:
            raise HTTPException(status_code=400, detail="Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi")
        
        # Tạo review mới
        new_review = {
            "order_id": order_id,
            "product_id": product_id,
            "customer_id": customer_id,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Lưu review
        result = reviews_collection.insert_one(new_review)
        new_review["id"] = str(result.inserted_id)
        
        # Cập nhật rating trung bình của sản phẩm
        update_product_rating(product_id)
        
        return convert_review_for_response(new_review)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi tạo đánh giá: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/all")
async def get_all_reviews(
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang"),
    rating: Optional[int] = Query(None, ge=1, le=5, description="Lọc theo đánh giá")
):
    """Lấy tất cả đánh giá"""
    try:
        # Xây dựng filter
        filter_dict = {}
        
        if rating:
            filter_dict["rating"] = rating
        
        # Đếm tổng số review
        total = reviews_collection.count_documents(filter_dict)
        
        # Tính toán pagination
        skip = (page - 1) * limit
        total_pages = (total + limit - 1) // limit
        
        # Lấy reviews với pagination
        reviews_cursor = reviews_collection.find(filter_dict).sort("created_at", -1).skip(skip).limit(limit)
        reviews = list(reviews_cursor)
        
        # Chuyển đổi format
        converted_reviews = [convert_review_for_response(review) for review in reviews]
        
        return {
            "reviews": converted_reviews,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_reviews": total,
                "limit": limit
            }
        }
    except Exception as e:
        print(f"Lỗi khi lấy tất cả đánh giá: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/product/{product_id}")
async def get_product_reviews(
    product_id: str,
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang")
):
    """Lấy danh sách đánh giá của sản phẩm"""
    try:
        # Đếm tổng số review
        total = reviews_collection.count_documents({"product_id": product_id})
        
        # Tính toán pagination
        skip = (page - 1) * limit
        total_pages = (total + limit - 1) // limit
        
        # Lấy reviews với pagination
        reviews_cursor = reviews_collection.find({"product_id": product_id}).sort("created_at", -1).skip(skip).limit(limit)
        reviews = list(reviews_cursor)
        
        # Chuyển đổi format
        converted_reviews = [convert_review_for_response(review) for review in reviews]
        
        return {
            "reviews": converted_reviews,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_reviews": total,
                "limit": limit
            }
        }
    except Exception as e:
        print(f"Lỗi khi lấy đánh giá sản phẩm: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/customer/{customer_id}")
async def get_customer_reviews(
    customer_id: str,
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang")
):
    """Lấy danh sách đánh giá của khách hàng"""
    try:
        # Đếm tổng số review
        total = reviews_collection.count_documents({"customer_id": customer_id})
        
        # Tính toán pagination
        skip = (page - 1) * limit
        total_pages = (total + limit - 1) // limit
        
        # Lấy reviews với pagination
        reviews_cursor = reviews_collection.find({"customer_id": customer_id}).sort("created_at", -1).skip(skip).limit(limit)
        reviews = list(reviews_cursor)
        
        # Chuyển đổi format
        converted_reviews = [convert_review_for_response(review) for review in reviews]
        
        return {
            "reviews": converted_reviews,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_reviews": total,
                "limit": limit
            }
        }
    except Exception as e:
        print(f"Lỗi khi lấy đánh giá khách hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/order/{order_id}")
async def get_order_reviews(order_id: str):
    """Lấy danh sách đánh giá của đơn hàng"""
    try:
        reviews_cursor = reviews_collection.find({"order_id": order_id})
        reviews = list(reviews_cursor)
        
        # Chuyển đổi format
        converted_reviews = [convert_review_for_response(review) for review in reviews]
        
        return {"reviews": converted_reviews}
    except Exception as e:
        print(f"Lỗi khi lấy đánh giá đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

def update_product_rating(product_id: str):
    """Cập nhật rating trung bình của sản phẩm"""
    try:
        # Tính rating trung bình
        pipeline = [
            {"$match": {"product_id": product_id}},
            {"$group": {
                "_id": None,
                "average_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1}
            }}
        ]
        
        result = list(reviews_collection.aggregate(pipeline))
        
        if result:
            avg_rating = round(result[0]["average_rating"], 1)
            total_reviews = result[0]["total_reviews"]
            
            # Cập nhật sản phẩm
            products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {
                    "$set": {
                        "rating": avg_rating,
                        "review_count": total_reviews,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            print(f"✅ Đã cập nhật rating sản phẩm {product_id}: {avg_rating}/5 ({total_reviews} đánh giá)")
        
    except Exception as e:
        print(f"Lỗi khi cập nhật rating sản phẩm: {e}")

@router.put("/{review_id}")
async def update_review(review_id: str, review_data: dict):
    """Cập nhật đánh giá"""
    try:
        rating = review_data.get("rating")
        comment = review_data.get("comment")
        
        if rating is not None and (not isinstance(rating, int) or rating < 1 or rating > 5):
            raise HTTPException(status_code=400, detail="Đánh giá phải là số từ 1 đến 5")
        
        # Cập nhật review
        update_data = {"updated_at": datetime.utcnow()}
        if rating is not None:
            update_data["rating"] = rating
        if comment is not None:
            update_data["comment"] = comment
        
        result = reviews_collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
        
        # Lấy review đã cập nhật
        updated_review = reviews_collection.find_one({"_id": ObjectId(review_id)})
        
        # Cập nhật rating trung bình của sản phẩm
        if rating is not None:
            update_product_rating(updated_review["product_id"])
        
        return convert_review_for_response(updated_review)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi cập nhật đánh giá: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{review_id}")
async def delete_review(review_id: str):
    """Xóa đánh giá"""
    try:
        # Lấy review trước khi xóa để cập nhật rating sản phẩm
        review = reviews_collection.find_one({"_id": ObjectId(review_id)})
        if not review:
            raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
        
        # Xóa review
        result = reviews_collection.delete_one({"_id": ObjectId(review_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
        
        # Cập nhật rating trung bình của sản phẩm
        update_product_rating(review["product_id"])
        
        return {"message": "Đánh giá đã được xóa thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi xóa đánh giá: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
