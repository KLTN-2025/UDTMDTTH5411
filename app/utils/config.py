from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017/"
    db_name: str = "fashion-video-app-stg"
    collection_name: str = "productsv2"  # Tên collection trong MongoDB
    embedder_model: str = "fashion-clip"  # Sử dụng FashionCLIP
    index_path: str = "data/indices/fashion_index.faiss"
    image_field: str = "images"  # Trường chứa URL hình ảnh
    batch_size: int = 32
    feature_dimension: int = 512  # Dimension cho FashionCLIP
    torch_home: str | None = None  # Thư mục cache Torch tùy chọn
    max_images_per_product: int = 3  # Số ảnh tối đa dùng mỗi sản phẩm khi training
    # Detection
    use_object_detection: bool = True
    detection_min_conf: float = 0.5
    detection_padding_ratio: float = 0.1
    # FashionCLIP specific settings
    fashionclip_model_name: str = "fashion-clip"  # Tên model FashionCLIP
    # FAISS index settings
    index_type: str = "flat"  # flat | hnsw | ivf_flat
    hnsw_m: int = 32
    hnsw_efConstruction: int = 80
    hnsw_efSearch: int = 64
    ivf_nlist: int = 512
    ivf_nprobe: int = 32
    # Rerank settings
    rerank_enabled: bool = True
    rerank_weight_similarity: float = 0.85
    rerank_weight_price: float = 0.15
    rerank_price_tolerance: float = 0.3  # tỉ lệ chênh lệch chấp nhận so với giá truy vấn
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Bỏ qua biến môi trường thừa nếu có

@lru_cache()
def get_settings():
    return Settings()