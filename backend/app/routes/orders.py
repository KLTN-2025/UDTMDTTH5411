from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.database import orders_collection, products_collection

router = APIRouter(prefix="/orders", tags=["Orders"])

def convert_order_for_response(order):
    """Chuyển đổi order từ MongoDB thành format JSON-safe"""
    if order is None:
        return None
    
    # Chuyển đổi ObjectId thành string
    if "_id" in order:
        order["id"] = str(order["_id"])
        del order["_id"]
    
    # Chuyển đổi datetime thành string
    if "created_at" in order and hasattr(order["created_at"], 'isoformat'):
        order["created_at"] = order["created_at"].isoformat()
    if "updated_at" in order and hasattr(order["updated_at"], 'isoformat'):
        order["updated_at"] = order["updated_at"].isoformat()
    
    return order

@router.post("/test")
async def test_create_order(order_data: dict):
    """Test tạo đơn hàng không cần auth"""
    try:
        # Tạo đơn hàng test
        new_order = {
            "customer_id": "test_customer_id",
            "items": order_data.get("items", []),
            "shipping_address": order_data.get("shipping_address", "Test address"),
            "payment_method": order_data.get("payment_method", "cod"),
            "total_amount": order_data.get("total_amount", 0),
            "status": "pending",
            "notes": order_data.get("notes", ""),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = orders_collection.insert_one(new_order)
        new_order["id"] = str(result.inserted_id)
        
        return {"message": "Test order created successfully", "order": new_order}
    except Exception as e:
        print(f"Lỗi khi tạo đơn hàng test: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/debug")
async def debug_order_creation():
    """Debug endpoint để kiểm tra ObjectId serialization"""
    try:
        print("🔍 Debug ObjectId serialization...")
        
        # Test 1: Tạo order với ObjectId
        test_order = {
            "customer_id": "debug_123",
            "shop_id": "68cfdbcab2798afe40242206",
            "items": [
                {
                    "product_id": "68d69621db517c5354af0820",  # String
                    "quantity": 1,
                    "price": 100000
                }
            ],
            "total_amount": 100000,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        print(f"📋 Test order trước khi insert: {test_order}")
        
        # Insert vào database
        result = orders_collection.insert_one(test_order)
        print(f"✅ Insert thành công, ID: {result.inserted_id}")
        
        # Chuẩn bị response
        response_order = {
            "id": str(result.inserted_id),
            "customer_id": test_order["customer_id"],
            "shop_id": test_order["shop_id"],
            "items": test_order["items"],
            "total_amount": test_order["total_amount"],
            "status": test_order["status"],
            "created_at": test_order["created_at"].isoformat(),
            "updated_at": test_order["updated_at"].isoformat()
        }
        
        print(f"📤 Response order: {response_order}")
        
        return response_order
        
    except Exception as e:
        print(f"❌ Lỗi debug: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi debug: {str(e)}")

@router.post("/debug2")
async def debug_order_creation_with_product_query():
    """Debug endpoint để test query product và lấy shop_id"""
    try:
        print("🔍 Debug query product và lấy shop_id...")
        
        # Test query product
        product_id = "68d69621db517c5354af0820"
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        
        if product:
            print(f"✅ Tìm thấy product: {product}")
            shop_id = product.get("shop_id")
            print(f"✅ Shop ID: {shop_id}")
            
            # Test tạo order với shop_id từ product
            test_order = {
                "customer_id": "debug2_123",
                "shop_id": shop_id,
                "items": [
                    {
                        "product_id": product_id,
                        "quantity": 1,
                        "price": 100000
                    }
                ],
                "total_amount": 100000,
                "status": "pending",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            print(f"📋 Test order: {test_order}")
            
            # Insert vào database
            result = orders_collection.insert_one(test_order)
            print(f"✅ Insert thành công, ID: {result.inserted_id}")
            
            # Chuẩn bị response
            response_order = {
                "id": str(result.inserted_id),
                "customer_id": test_order["customer_id"],
                "shop_id": test_order["shop_id"],
                "items": test_order["items"],
                "total_amount": test_order["total_amount"],
                "status": test_order["status"],
                "created_at": test_order["created_at"].isoformat(),
                "updated_at": test_order["updated_at"].isoformat()
            }
            
            return response_order
        else:
            return {"error": "Không tìm thấy product"}
        
    except Exception as e:
        print(f"❌ Lỗi debug2: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi debug2: {str(e)}")

@router.post("/debug3")
async def debug_order_creation_exact_logic():
    """Debug endpoint để test chính xác logic của create_order"""
    try:
        print("🔍 Debug logic chính xác của create_order...")
        
        # Dữ liệu giống như test_simple_order.py
        order_data = {
            "customer_id": "test_customer_123",
            "items": [
                {
                    "product_id": "68d69621db517c5354af0820",
                    "quantity": 1,
                    "price": 100000,
                    "size": "M",
                    "color": "Đỏ"
                }
            ],
            "shipping_address": "Test Address",
            "payment_method": "cod",
            "total_amount": 100000,
            "notes": "Test order"
        }
        
        print(f"📥 Dữ liệu đầu vào: {order_data}")
        
        # Logic giống hệt create_order
        items = order_data.get("items", [])
        shop_id = None
        
        # Lấy shop_id từ product đầu tiên trong database
        if items and len(items) > 0:
            first_item = items[0]
            product_id = first_item.get("product_id")
            
            if product_id:
                # Query product từ database để lấy shop_id
                product = products_collection.find_one({"_id": ObjectId(product_id)})
                if product:
                    shop_id = product.get("shop_id")
                    print(f"✅ Lấy shop_id từ product: {shop_id}")
                    # Không in product object vì nó chứa ObjectId
                else:
                    print(f"⚠️ Không tìm thấy product với ID: {product_id}")
            else:
                print("⚠️ Không có product_id trong item đầu tiên")
        
        # Tạo đơn hàng mới
        new_order = {
            "customer_id": order_data.get("customer_id", "unknown"),
            "shop_id": shop_id,  # Thêm shop_id để shop có thể xem đơn hàng của mình
            "items": items,
            "shipping_address": order_data.get("shipping_address", ""),
            "payment_method": order_data.get("payment_method", "cod"),
            "total_amount": order_data.get("total_amount", 0),
            "status": "pending",
            "notes": order_data.get("notes", ""),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        print(f"📋 New order trước khi insert: {new_order}")
        
        result = orders_collection.insert_one(new_order)
        
        # Thêm id trước
        new_order["id"] = str(result.inserted_id)
        
        # Chuyển đổi datetime thành string để tránh lỗi serialization
        new_order["created_at"] = new_order["created_at"].isoformat()
        new_order["updated_at"] = new_order["updated_at"].isoformat()
        
        # Đảm bảo tất cả ObjectId trong items được convert thành string
        for item in new_order["items"]:
            if "product_id" in item and isinstance(item["product_id"], ObjectId):
                item["product_id"] = str(item["product_id"])
        
        print(f"📤 Final order: {new_order}")
        
        return new_order
        
    except Exception as e:
        print(f"❌ Lỗi debug3: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi debug3: {str(e)}")

@router.post("/debug4")
async def debug_step_by_step():
    """Debug từng bước để tìm lỗi chính xác"""
    try:
        print("🔍 Debug từng bước...")
        
        # Bước 1: Test query product
        print("📦 Bước 1: Query product...")
        product_id = "68d69621db517c5354af0820"
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        
        if not product:
            return {"error": "Không tìm thấy product"}
        
        print(f"✅ Tìm thấy product")
        shop_id = product.get("shop_id")
        print(f"✅ Shop ID: {shop_id}")
        
        # Bước 2: Test tạo order đơn giản
        print("📋 Bước 2: Tạo order đơn giản...")
        simple_order = {
            "customer_id": "debug4_123",
            "shop_id": shop_id,
            "items": [{"product_id": product_id, "quantity": 1}],
            "total_amount": 100000,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        print(f"✅ Order đơn giản: {simple_order}")
        
        # Bước 3: Test insert
        print("💾 Bước 3: Insert vào database...")
        result = orders_collection.insert_one(simple_order)
        print(f"✅ Insert thành công: {result.inserted_id}")
        
        # Bước 4: Test response
        print("📤 Bước 4: Chuẩn bị response...")
        response_order = {
            "id": str(result.inserted_id),
            "customer_id": simple_order["customer_id"],
            "shop_id": simple_order["shop_id"],
            "items": simple_order["items"],
            "total_amount": simple_order["total_amount"],
            "status": simple_order["status"],
            "created_at": simple_order["created_at"].isoformat(),
            "updated_at": simple_order["updated_at"].isoformat()
        }
        
        print(f"✅ Response order: {response_order}")
        
        return response_order
        
    except Exception as e:
        print(f"❌ Lỗi debug4: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi debug4: {str(e)}")

@router.post("/")
async def create_order(order_data: dict):
    """Tạo đơn hàng mới"""
    try:
        print(f"📥 Nhận dữ liệu order: {order_data}")
        
        # Lấy thông tin items
        items = order_data.get("items", [])
        shop_id = None
        
        # Lấy shop_id từ product đầu tiên trong database
        if items and len(items) > 0:
            first_item = items[0]
            product_id = first_item.get("product_id")
            
            if product_id:
                # Query product từ database để lấy shop_id
                product = products_collection.find_one({"_id": ObjectId(product_id)})
                if product:
                    shop_id = product.get("shop_id")
                    print(f"✅ Lấy shop_id từ product: {shop_id}")
                else:
                    print(f"⚠️ Không tìm thấy product với ID: {product_id}")
            else:
                print("⚠️ Không có product_id trong item đầu tiên")
        
        # Tạo đơn hàng mới (logic đơn giản đã test thành công)
        new_order = {
            "customer_id": order_data.get("customer_id", "unknown"),
            "shop_id": shop_id,
            "items": items,
            "shipping_address": order_data.get("shipping_address", ""),
            "payment_method": order_data.get("payment_method", "cod"),
            "total_amount": order_data.get("total_amount", 0),
            "status": "pending",
            "notes": order_data.get("notes", ""),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        print(f"📋 Order trước khi insert: {new_order}")
        
        # Insert vào database
        result = orders_collection.insert_one(new_order)
        print(f"✅ Insert thành công: {result.inserted_id}")
        
        # Chuẩn bị response (logic đơn giản đã test thành công)
        response_order = {
            "id": str(result.inserted_id),
            "customer_id": new_order["customer_id"],
            "shop_id": new_order["shop_id"],
            "items": new_order["items"],
            "shipping_address": new_order["shipping_address"],
            "payment_method": new_order["payment_method"],
            "total_amount": new_order["total_amount"],
            "status": new_order["status"],
            "notes": new_order["notes"],
            "created_at": new_order["created_at"].isoformat(),
            "updated_at": new_order["updated_at"].isoformat()
        }
        
        print(f"📤 Response order: {response_order}")
        
        return response_order
        
    except Exception as e:
        print(f"❌ Lỗi khi tạo đơn hàng: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/", response_model=List[dict])
async def get_orders(
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái")
):
    """Lấy danh sách đơn hàng"""
    try:
        # Xây dựng filter
        filter_dict = {}
        
        if status:
            filter_dict["status"] = status
        
        # Đếm tổng số đơn hàng
        total = orders_collection.count_documents(filter_dict)
        
        # Lấy đơn hàng với phân trang
        skip = (page - 1) * limit
        orders = list(orders_collection.find(filter_dict)
                     .skip(skip)
                     .limit(limit)
                     .sort("created_at", -1))
        
        # Chuyển đổi ObjectId và datetime thành string
        for order in orders:
            convert_order_for_response(order)
        
        return {
            "orders": orders,
            "total": total,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        print(f"Lỗi khi lấy đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/shop/{shop_id}")
async def get_shop_orders(
    shop_id: str,
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái")
):
    """Lấy danh sách đơn hàng của shop"""
    try:
        print(f"🏪 Lấy đơn hàng cho shop_id: {shop_id}")
        
        # Xây dựng filter cho shop
        filter_dict = {"shop_id": shop_id}
        
        if status:
            filter_dict["status"] = status
        
        # Đếm tổng số đơn hàng của shop
        total = orders_collection.count_documents(filter_dict)
        print(f"📊 Tổng số đơn hàng của shop: {total}")
        
        # Lấy đơn hàng với phân trang
        skip = (page - 1) * limit
        orders = list(orders_collection.find(filter_dict)
                     .skip(skip)
                     .limit(limit)
                     .sort("created_at", -1))
        
        print(f"📋 Lấy được {len(orders)} đơn hàng")
        
        # Chuyển đổi ObjectId và datetime thành string
        for order in orders:
            convert_order_for_response(order)
        
        return {
            "orders": orders,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "shop_id": shop_id
        }
    except Exception as e:
        print(f"Lỗi khi lấy đơn hàng của shop: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/admin/all")
async def get_all_orders_admin(
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    shop_id: Optional[str] = Query(None, description="Lọc theo shop_id")
):
    """Admin xem tất cả đơn hàng của tất cả shop"""
    try:
        print(f"👑 Admin xem tất cả đơn hàng")
        
        # Xây dựng filter
        filter_dict = {}
        
        if status:
            filter_dict["status"] = status
        if shop_id:
            filter_dict["shop_id"] = shop_id
        
        # Đếm tổng số đơn hàng
        total = orders_collection.count_documents(filter_dict)
        print(f"📊 Tổng số đơn hàng: {total}")
        
        # Lấy đơn hàng với phân trang
        skip = (page - 1) * limit
        orders = list(orders_collection.find(filter_dict)
                     .skip(skip)
                     .limit(limit)
                     .sort("created_at", -1))
        
        print(f"📋 Lấy được {len(orders)} đơn hàng")
        
        # Chuyển đổi ObjectId và datetime thành string
        for order in orders:
            convert_order_for_response(order)
        
        return {
            "orders": orders,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "filters": {
                "status": status,
                "shop_id": shop_id
            }
        }
    except Exception as e:
        print(f"Lỗi khi admin lấy đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{order_id}/status")
async def update_order_status(order_id: str, status_data: dict):
    """Cập nhật trạng thái đơn hàng (Admin/Shop)"""
    try:
        print(f"🔄 Cập nhật trạng thái đơn hàng {order_id}")
        
        # Kiểm tra đơn hàng có tồn tại không
        existing_order = orders_collection.find_one({"_id": ObjectId(order_id)})
        if not existing_order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        # Lấy trạng thái mới
        new_status = status_data.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Thiếu trạng thái mới")
        
        # Kiểm tra trạng thái hợp lệ
        valid_statuses = ["pending", "confirmed", "shipping", "delivered", "cancelled"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ. Chỉ chấp nhận: {valid_statuses}")
        
        # Cập nhật trạng thái
        update_data = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Thêm ghi chú nếu có
        if "notes" in status_data:
            update_data["notes"] = status_data["notes"]
        
        result = orders_collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Không thể cập nhật trạng thái")
        
        print(f"✅ Cập nhật trạng thái thành công: {new_status}")
        
        # Lấy đơn hàng đã cập nhật
        updated_order = orders_collection.find_one({"_id": ObjectId(order_id)})
        return convert_order_for_response(updated_order)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi cập nhật trạng thái đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/customer/{customer_id}")
async def get_customer_orders(
    customer_id: str,
    page: int = Query(1, ge=1, description="Trang"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mỗi trang"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái")
):
    """Lấy danh sách đơn hàng của khách hàng"""
    try:
        print(f"👤 Lấy đơn hàng cho customer_id: {customer_id}")
        
        # Xây dựng filter cho customer
        filter_dict = {"customer_id": customer_id}
        
        if status:
            filter_dict["status"] = status
        
        # Đếm tổng số đơn hàng
        total = orders_collection.count_documents(filter_dict)
        
        # Tính toán pagination
        skip = (page - 1) * limit
        total_pages = (total + limit - 1) // limit
        
        # Lấy đơn hàng với pagination
        orders_cursor = orders_collection.find(filter_dict).sort("created_at", -1).skip(skip).limit(limit)
        orders = list(orders_cursor)
        
        # Chuyển đổi format
        converted_orders = [convert_order_for_response(order) for order in orders]
        
        return {
            "orders": converted_orders,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_orders": total,
                "limit": limit
            }
        }
    except Exception as e:
        print(f"Lỗi khi lấy đơn hàng của customer: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/{order_id}")
async def get_order(order_id: str):
    """Lấy chi tiết đơn hàng"""
    try:
        order = orders_collection.find_one({"_id": ObjectId(order_id)})
        
        if not order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        # Không kiểm tra quyền truy cập (đơn giản hóa)
        
        return convert_order_for_response(order)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi lấy đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{order_id}")
async def update_order_status(
    order_id: str,
    status_data: dict
):
    """Cập nhật trạng thái đơn hàng"""
    # Không kiểm tra quyền (đơn giản hóa)
    
    try:
        new_status = status_data.get("status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Trạng thái là bắt buộc")
        
        # Cập nhật trạng thái
        result = orders_collection.update_one(
            {"_id": ObjectId(order_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        # Lấy đơn hàng đã cập nhật
        updated_order = orders_collection.find_one({"_id": ObjectId(order_id)})
        updated_order["id"] = str(updated_order["_id"])
        del updated_order["_id"]
        
        return updated_order
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi cập nhật đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{order_id}")
async def cancel_order(order_id: str):
    """Hủy đơn hàng"""
    try:
        order = orders_collection.find_one({"_id": ObjectId(order_id)})
        
        if not order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        # Không kiểm tra quyền (đơn giản hóa)
        
        # Chỉ cho phép hủy đơn hàng ở trạng thái pending
        if order.get("status") != "pending":
            raise HTTPException(
                status_code=400,
                detail="Chỉ có thể hủy đơn hàng đang chờ xử lý"
            )
        
        # Cập nhật trạng thái thành cancelled
        result = orders_collection.update_one(
            {"_id": ObjectId(order_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
        return {"message": "Đơn hàng đã được hủy thành công"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi hủy đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")