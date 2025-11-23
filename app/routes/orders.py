from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.database import orders_collection, products_collection, users_collection

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

@router.get("/analytics/revenue-by-category")
async def get_revenue_by_category():
    """Lấy dữ liệu doanh thu theo danh mục để hiển thị biểu đồ"""
    try:
        # Lấy tất cả đơn hàng đã giao (delivered)
        delivered_orders = orders_collection.find({"status": "delivered"})
        
        # Dictionary để lưu doanh thu theo danh mục
        revenue_by_category = {}
        
        for order in delivered_orders:
            items = order.get("items", [])
            total_amount = order.get("total_amount", 0)
            
            # Tính doanh thu cho từng sản phẩm trong đơn hàng
            for item in items:
                product_id = item.get("product_id")
                quantity = item.get("quantity", 1)
                price = item.get("price", 0)
                
                if product_id:
                    # Lấy thông tin sản phẩm để biết danh mục
                    try:
                        product = products_collection.find_one({"_id": ObjectId(product_id)})
                        if product:
                            category = product.get("category", "Khác")
                            item_revenue = price * quantity
                            
                            if category not in revenue_by_category:
                                revenue_by_category[category] = 0
                            revenue_by_category[category] += item_revenue
                    except Exception as e:
                        print(f"Lỗi khi lấy thông tin sản phẩm {product_id}: {e}")
                        continue
        
        # Chuyển đổi thành format phù hợp cho biểu đồ
        chart_data = [
            {
                "name": category,
                "value": round(revenue, 2),
                "percentage": 0  # Sẽ tính sau
            }
            for category, revenue in revenue_by_category.items()
        ]
        
        # Tính tổng doanh thu
        total_revenue = sum(item["value"] for item in chart_data)
        
        # Tính phần trăm cho mỗi danh mục
        for item in chart_data:
            if total_revenue > 0:
                item["percentage"] = round((item["value"] / total_revenue) * 100, 2)
            else:
                item["percentage"] = 0
        
        # Sắp xếp theo doanh thu giảm dần
        chart_data.sort(key=lambda x: x["value"], reverse=True)
        
        return {
            "data": chart_data,
            "total_revenue": round(total_revenue, 2),
            "total_orders": orders_collection.count_documents({"status": "delivered"})
        }
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu doanh thu: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/analytics/revenue-by-shop")
async def get_revenue_by_shop():
    """Lấy dữ liệu doanh thu theo shop, bao gồm revenue, cost và profit"""
    try:
        # Lấy tất cả đơn hàng đã giao (delivered)
        delivered_orders = orders_collection.find({"status": "delivered"})
        
        # Dictionary để lưu thông tin theo shop
        shop_data = {}
        
        for order in delivered_orders:
            shop_id = order.get("shop_id")
            if not shop_id:
                continue
                
            items = order.get("items", [])
            
            # Khởi tạo dữ liệu shop nếu chưa có
            if shop_id not in shop_data:
                shop_data[shop_id] = {
                    "shop_id": shop_id,
                    "shop_name": "Chưa xác định",
                    "revenue": 0,
                    "cost": 0,
                    "profit": 0,
                    "total_orders": 0
                }
            
            shop_data[shop_id]["total_orders"] += 1
            
            # Tính doanh thu, cost và profit cho từng sản phẩm trong đơn hàng
            for item in items:
                product_id = item.get("product_id")
                quantity = item.get("quantity", 1)
                price = item.get("price", 0)
                
                if product_id:
                    try:
                        product = products_collection.find_one({"_id": ObjectId(product_id)})
                        if product:
                            # Tính doanh thu (revenue) = giá bán * số lượng
                            item_revenue = price * quantity
                            shop_data[shop_id]["revenue"] += item_revenue
                            
                            # Tính tiền gốc (cost) = giá gốc * số lượng
                            # Nếu không có original_price, ước tính 70% giá bán
                            original_price = product.get("original_price")
                            if original_price and original_price > 0:
                                item_cost = original_price * quantity
                            else:
                                # Ước tính cost = 70% của giá bán nếu không có original_price
                                item_cost = price * 0.7 * quantity
                            
                            shop_data[shop_id]["cost"] += item_cost
                            
                            # Tính lợi nhuận (profit) = revenue - cost
                            shop_data[shop_id]["profit"] += (item_revenue - item_cost)
                    except Exception as e:
                        print(f"Lỗi khi lấy thông tin sản phẩm {product_id}: {e}")
                        continue
        
        # Lấy tên shop từ users collection
        for shop_id in shop_data.keys():
            try:
                shop_user = users_collection.find_one({"_id": ObjectId(shop_id), "role": "shop"})
                if shop_user:
                    # Lấy tên shop từ profile hoặc username
                    profile = shop_user.get("profile", {})
                    if profile.get("firstName") and profile.get("lastName"):
                        shop_data[shop_id]["shop_name"] = f"{profile['firstName']} {profile['lastName']}"
                    elif profile.get("shopName"):
                        shop_data[shop_id]["shop_name"] = profile["shopName"]
                    else:
                        shop_data[shop_id]["shop_name"] = shop_user.get("username", f"Shop {shop_id[:8]}")
            except Exception as e:
                print(f"Lỗi khi lấy tên shop {shop_id}: {e}")
                shop_data[shop_id]["shop_name"] = f"Shop {shop_id[:8]}"
        
        # Chuyển đổi thành format phù hợp cho biểu đồ
        chart_data = []
        total_revenue = 0
        total_cost = 0
        total_profit = 0
        
        for shop_id, data in shop_data.items():
            revenue = round(data["revenue"], 2)
            cost = round(data["cost"], 2)
            profit = round(data["profit"], 2)
            
            total_revenue += revenue
            total_cost += cost
            total_profit += profit
            
            chart_data.append({
                "shop_id": shop_id,
                "name": data["shop_name"],
                "revenue": revenue,
                "cost": cost,
                "profit": profit,
                "total_orders": data["total_orders"],
                "percentage": 0  # Sẽ tính sau
            })
        
        # Tính phần trăm doanh thu cho mỗi shop
        for item in chart_data:
            if total_revenue > 0:
                item["percentage"] = round((item["revenue"] / total_revenue) * 100, 2)
            else:
                item["percentage"] = 0
        
        # Sắp xếp theo doanh thu giảm dần
        chart_data.sort(key=lambda x: x["revenue"], reverse=True)
        
        return {
            "data": chart_data,
            "summary": {
                "total_revenue": round(total_revenue, 2),
                "total_cost": round(total_cost, 2),
                "total_profit": round(total_profit, 2),
                "total_orders": orders_collection.count_documents({"status": "delivered"})
            }
        }
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu doanh thu theo shop: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")