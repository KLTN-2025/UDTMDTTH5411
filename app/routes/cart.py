from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from app.database import cart_collection, products_collection
from app.models.cart import CartResponse, AddToCartRequest
from app.routes.auth import get_current_user

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("/", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    """Lấy giỏ hàng của user"""
    user_id = str(current_user["_id"])
    
    cart = cart_collection.find_one({"user_id": user_id})
    if not cart:
        # Tạo giỏ hàng mới nếu chưa có
        new_cart = {
            "user_id": user_id,
            "items": [],
            "total_amount": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = cart_collection.insert_one(new_cart)
        cart = cart_collection.find_one({"_id": result.inserted_id})
    
    cart["id"] = str(cart["_id"])
    del cart["_id"]
    
    return cart

@router.post("/add", response_model=CartResponse)
async def add_to_cart(
    request: AddToCartRequest,
    current_user: dict = Depends(get_current_user)
):
    """Thêm sản phẩm vào giỏ hàng"""
    from bson import ObjectId
    
    user_id = str(current_user["_id"])
    
    # Kiểm tra sản phẩm có tồn tại không
    product = products_collection.find_one({"_id": ObjectId(request.product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    
    if not product.get("is_active", True):
        raise HTTPException(status_code=400, detail="Sản phẩm không còn hoạt động")
    
    if product.get("stock", 0) < request.quantity:
        raise HTTPException(status_code=400, detail="Số lượng sản phẩm không đủ")
    
    # Lấy hoặc tạo giỏ hàng
    cart = cart_collection.find_one({"user_id": user_id})
    if not cart:
        cart = {
            "user_id": user_id,
            "items": [],
            "total_amount": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        cart_collection.insert_one(cart)
    
    # Kiểm tra sản phẩm đã có trong giỏ hàng chưa
    existing_item = None
    for item in cart["items"]:
        if item["product_id"] == request.product_id:
            existing_item = item
            break
    
    if existing_item:
        # Cập nhật số lượng
        existing_item["quantity"] += request.quantity
    else:
        # Thêm sản phẩm mới
        cart["items"].append({
            "product_id": request.product_id,
            "quantity": request.quantity,
            "price": product["price"]
        })
    
    # Tính lại tổng tiền
    total_amount = 0.0
    for item in cart["items"]:
        total_amount += item["quantity"] * item["price"]
    
    cart["total_amount"] = total_amount
    cart["updated_at"] = datetime.utcnow()
    
    # Cập nhật giỏ hàng
    cart_collection.update_one(
        {"user_id": user_id},
        {"$set": cart}
    )
    
    cart["id"] = str(cart["_id"])
    del cart["_id"]
    
    return cart

@router.put("/update/{product_id}", response_model=CartResponse)
async def update_cart_item(
    product_id: str,
    quantity: int,
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật số lượng sản phẩm trong giỏ hàng"""
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Số lượng phải lớn hơn 0")
    
    user_id = str(current_user["_id"])
    
    cart = cart_collection.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Không tìm thấy giỏ hàng")
    
    # Tìm sản phẩm trong giỏ hàng
    item_found = False
    for item in cart["items"]:
        if item["product_id"] == product_id:
            item["quantity"] = quantity
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ hàng")
    
    # Tính lại tổng tiền
    total_amount = 0.0
    for item in cart["items"]:
        total_amount += item["quantity"] * item["price"]
    
    cart["total_amount"] = total_amount
    cart["updated_at"] = datetime.utcnow()
    
    # Cập nhật giỏ hàng
    cart_collection.update_one(
        {"user_id": user_id},
        {"$set": cart}
    )
    
    cart["id"] = str(cart["_id"])
    del cart["_id"]
    
    return cart

@router.delete("/remove/{product_id}", response_model=CartResponse)
async def remove_from_cart(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Xóa sản phẩm khỏi giỏ hàng"""
    user_id = str(current_user["_id"])
    
    cart = cart_collection.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Không tìm thấy giỏ hàng")
    
    # Xóa sản phẩm khỏi giỏ hàng
    cart["items"] = [item for item in cart["items"] if item["product_id"] != product_id]
    
    # Tính lại tổng tiền
    total_amount = 0.0
    for item in cart["items"]:
        total_amount += item["quantity"] * item["price"]
    
    cart["total_amount"] = total_amount
    cart["updated_at"] = datetime.utcnow()
    
    # Cập nhật giỏ hàng
    cart_collection.update_one(
        {"user_id": user_id},
        {"$set": cart}
    )
    
    cart["id"] = str(cart["_id"])
    del cart["_id"]
    
    return cart

@router.delete("/clear")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    """Xóa toàn bộ giỏ hàng"""
    user_id = str(current_user["_id"])
    
    cart_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "items": [],
                "total_amount": 0.0,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Giỏ hàng đã được xóa thành công"}