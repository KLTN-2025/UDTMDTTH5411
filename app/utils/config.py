from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017/"
    db_name: str = "fashion-video-app-stg"
    collection_name: str = "productsv2"
    embedder_model: str = "fashion-clip"
    index_path: str = "data/indices/fashion_index.faiss"
    image_field: str = "images"
    batch_size: int = 32
    feature_dimension: int = 512
    torch_home: str | None = None
    max_images_per_product: int = 3
    # Detection
    use_object_detection: bool = True
    detection_min_conf: float = 0.5
    detection_padding_ratio: float = 0.1
    # FashionCLIP specific settings
    fashionclip_model_name: str = "fashion-clip"
    # FAISS index settings
    index_type: str = "flat"
    hnsw_m: int = 32
    hnsw_efConstruction: int = 80
    hnsw_efSearch: int = 64
    ivf_nlist: int = 512
    ivf_nprobe: int = 32
    # Rerank settings
    rerank_enabled: bool = True
    rerank_weight_similarity: float = 0.85
    rerank_weight_price: float = 0.15
    rerank_price_tolerance: float = 0.3
    
    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()