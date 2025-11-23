import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
import os

# Cấu hình Cloudinary
cloudinary.config(
    cloud_name="diy6zgu0f",
    api_key="791438346649772", 
    api_secret="9CEPjRen509H5fe_Q6MpWhqBCq4",
    secure=True
)

def upload_image_to_cloudinary(file_path: str, public_id: str = None, folder: str = "products"):
    """
    Upload ảnh lên Cloudinary
    
    Args:
        file_path: Đường dẫn file ảnh
        public_id: ID công khai cho ảnh (tùy chọn)
        folder: Thư mục lưu trữ trên Cloudinary
    
    Returns:
        dict: Kết quả upload chứa URL và thông tin khác
    """
    try:
        upload_result = cloudinary.uploader.upload(
            file_path,
            public_id=public_id,
            folder=folder,
            resource_type="image",
            transformation=[
                {"width": 800, "height": 800, "crop": "limit", "quality": "auto"},
                {"fetch_format": "auto"}
            ]
        )
        return upload_result
    except Exception as e:
        print(f"Lỗi khi upload ảnh lên Cloudinary: {e}")
        raise e

def upload_image_from_url(image_url: str, public_id: str = None, folder: str = "products"):
    """
    Upload ảnh từ URL lên Cloudinary
    
    Args:
        image_url: URL của ảnh
        public_id: ID công khai cho ảnh (tùy chọn)
        folder: Thư mục lưu trữ trên Cloudinary
    
    Returns:
        dict: Kết quả upload chứa URL và thông tin khác
    """
    try:
        upload_result = cloudinary.uploader.upload(
            image_url,
            public_id=public_id,
            folder=folder,
            resource_type="image",
            transformation=[
                {"width": 800, "height": 800, "crop": "limit", "quality": "auto"},
                {"fetch_format": "auto"}
            ]
        )
        return upload_result
    except Exception as e:
        print(f"Lỗi khi upload ảnh từ URL lên Cloudinary: {e}")
        raise e

def get_optimized_image_url(public_id: str, width: int = 500, height: int = 500):
    """
    Lấy URL ảnh đã được tối ưu hóa từ Cloudinary
    
    Args:
        public_id: ID công khai của ảnh
        width: Chiều rộng
        height: Chiều cao
    
    Returns:
        str: URL ảnh đã được tối ưu hóa
    """
    try:
        url, _ = cloudinary_url(
            public_id,
            width=width,
            height=height,
            crop="auto",
            gravity="auto",
            fetch_format="auto",
            quality="auto"
        )
        return url
    except Exception as e:
        print(f"Lỗi khi tạo URL ảnh tối ưu: {e}")
        raise e

def delete_image_from_cloudinary(public_id: str):
    """
    Xóa ảnh khỏi Cloudinary
    
    Args:
        public_id: ID công khai của ảnh cần xóa
    
    Returns:
        dict: Kết quả xóa
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result
    except Exception as e:
        print(f"Lỗi khi xóa ảnh khỏi Cloudinary: {e}")
        raise e
