from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
import tempfile
import os
from app.cloudinary_config import upload_image_to_cloudinary, upload_image_from_url

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/image")
async def upload_single_image(
    file: UploadFile = File(...),
    folder: str = Form("products"),
    public_id: Optional[str] = Form(None)
):
    """
    Upload một ảnh lên Cloudinary
    """
    try:
        # Kiểm tra loại file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Chỉ chấp nhận file ảnh")
        
        # Tạo file tạm thời
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Upload lên Cloudinary
            upload_result = upload_image_to_cloudinary(
                file_path=temp_file_path,
                public_id=public_id,
                folder=folder
            )
            
            return {
                "success": True,
                "message": "Upload ảnh thành công",
                "data": {
                    "public_id": upload_result["public_id"],
                    "secure_url": upload_result["secure_url"],
                    "url": upload_result["url"],
                    "format": upload_result["format"],
                    "width": upload_result["width"],
                    "height": upload_result["height"],
                    "bytes": upload_result["bytes"]
                }
            }
            
        finally:
            # Xóa file tạm thời
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        print(f"Lỗi khi upload ảnh: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi upload ảnh: {str(e)}")

@router.post("/images")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    folder: str = Form("products")
):
    """
    Upload nhiều ảnh lên Cloudinary
    """
    try:
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Tối đa 10 ảnh mỗi lần upload")
        
        results = []
        temp_files = []
        
        try:
            for i, file in enumerate(files):
                # Kiểm tra loại file
                if not file.content_type or not file.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail=f"File {file.filename} không phải là ảnh")
                
                # Tạo file tạm thời
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
                    content = await file.read()
                    temp_file.write(content)
                    temp_file_path = temp_file.name
                    temp_files.append(temp_file_path)
                
                # Upload lên Cloudinary
                upload_result = upload_image_to_cloudinary(
                    file_path=temp_file_path,
                    public_id=f"{folder}_{i}_{file.filename.split('.')[0]}",
                    folder=folder
                )
                
                results.append({
                    "filename": file.filename,
                    "public_id": upload_result["public_id"],
                    "secure_url": upload_result["secure_url"],
                    "url": upload_result["url"],
                    "format": upload_result["format"],
                    "width": upload_result["width"],
                    "height": upload_result["height"],
                    "bytes": upload_result["bytes"]
                })
            
            return {
                "success": True,
                "message": f"Upload thành công {len(results)} ảnh",
                "data": results
            }
            
        finally:
            # Xóa tất cả file tạm thời
            for temp_file_path in temp_files:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
    except Exception as e:
        print(f"Lỗi khi upload nhiều ảnh: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi upload ảnh: {str(e)}")

@router.post("/image-from-url")
async def upload_image_from_url_endpoint(
    image_url: str = Form(...),
    folder: str = Form("products"),
    public_id: Optional[str] = Form(None)
):
    """
    Upload ảnh từ URL lên Cloudinary
    """
    try:
        upload_result = upload_image_from_url(
            image_url=image_url,
            public_id=public_id,
            folder=folder
        )
        
        return {
            "success": True,
            "message": "Upload ảnh từ URL thành công",
            "data": {
                "public_id": upload_result["public_id"],
                "secure_url": upload_result["secure_url"],
                "url": upload_result["url"],
                "format": upload_result["format"],
                "width": upload_result["width"],
                "height": upload_result["height"],
                "bytes": upload_result["bytes"]
            }
        }
        
    except Exception as e:
        print(f"Lỗi khi upload ảnh từ URL: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi upload ảnh từ URL: {str(e)}")

@router.get("/test")
async def test_cloudinary():
    """
    Test kết nối Cloudinary
    """
    try:
        # Test upload một ảnh demo
        test_url = "https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg"
        upload_result = upload_image_from_url(
            image_url=test_url,
            public_id="test_shoes",
            folder="test"
        )
        
        return {
            "success": True,
            "message": "Kết nối Cloudinary thành công",
            "data": {
                "public_id": upload_result["public_id"],
                "secure_url": upload_result["secure_url"]
            }
        }
        
    except Exception as e:
        print(f"Lỗi test Cloudinary: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi test Cloudinary: {str(e)}")
