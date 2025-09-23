import numpy as np
import faiss
from pymongo import MongoClient
from datetime import datetime
from typing import List, Optional, Dict, Any, Generator
import logging
from app.utils.config import get_settings
from bson import ObjectId

logger = logging.getLogger(__name__)
settings = get_settings()

class MongoDBManager:
    def __init__(self, connection_string: str = None, db_name: str = None, collection_name: str = None):
        self.client = MongoClient(connection_string or settings.mongo_uri)
        self.db = self.client[db_name or settings.db_name]
        self.collection_name = collection_name or settings.collection_name
        self.products_collection = self.db[self.collection_name]
    
    def _ensure_object_id(self, product_id):
        """Chuyển đổi id dạng string sang ObjectId nếu cần."""
        if isinstance(product_id, ObjectId):
            return product_id
        if isinstance(product_id, str):
            try:
                return ObjectId(product_id)
            except Exception:
                return product_id
        return product_id
    
    def get_all_products(self, batch_size: int = 1000) -> Generator[List[dict], None, None]:
        """Get all products from database with batching"""
        cursor = self.products_collection.find({})
        batch = []
        
        for product in cursor:
            batch.append(product)
            if len(batch) >= batch_size:
                yield batch
                batch = []
        
        if batch:
            yield batch
    
    def get_products_with_images(self, batch_size: int = 1000) -> Generator[List[dict], None, None]:
        """Get products that have images in the 'images' field"""
        query = {
            settings.image_field: {
                "$exists": True, 
                "$ne": [],
                "$not": {"$size": 0}
            }
        }
        
        cursor = self.products_collection.find(query)
        batch = []
        
        for product in cursor:
            # Ensure images field exists and is not empty
            if settings.image_field in product and product[settings.image_field]:
                batch.append(product)
                if len(batch) >= batch_size:
                    yield batch
                    batch = []
        
        if batch:
            yield batch
    
    def count_products_with_images(self) -> int:
        """Count products that have images"""
        query = {
            settings.image_field: {
                "$exists": True, 
                "$ne": [],
                "$not": {"$size": 0}
            }
        }
        return self.products_collection.count_documents(query)
    
    def update_product_features(self, product_id: str, features: List[float]):
        """Update product with extracted features"""
        self.products_collection.update_one(
            {"_id": self._ensure_object_id(product_id)},
            {"$set": {"features": features, "updated_at": datetime.now()}}
        )
    
    def get_product_by_id(self, product_id: str) -> Optional[dict]:
        """Get product by ID"""
        return self.products_collection.find_one({"_id": self._ensure_object_id(product_id)})
    
    def get_products_by_ids(self, product_ids: List[str]) -> List[dict]:
        """Get multiple products by their IDs"""
        object_ids = [self._ensure_object_id(pid) for pid in product_ids]
        return list(self.products_collection.find({"_id": {"$in": object_ids}}))
    
    def create_feature_index(self):
        """Create index on features field for faster searching"""
        self.products_collection.create_index("features")
    
    def get_random_products_with_images(self, limit: int = 10) -> List[dict]:
        """Get random products with images for testing"""
        pipeline = [
            {"$match": {settings.image_field: {"$exists": True, "$ne": []}}},
            {"$sample": {"size": limit}}
        ]
        return list(self.products_collection.aggregate(pipeline))

    def search_products_by_text(self, query: str, limit: int = 5) -> List[dict]:
        """Tìm sản phẩm theo từ khoá text trên trường name/description.
        Sử dụng regex không phân biệt hoa thường để tương thích rộng.
        """
        try:
            regex = {"$regex": query, "$options": "i"}
            cursor = self.products_collection.find(
                {"$or": [{"name": regex}, {"description": regex}]}
            ).limit(int(max(1, limit)))
            return list(cursor)
        except Exception:
            return []

class VectorDatabase:
    def __init__(self, dimension: int = None, index_type: str = None):
        self.dimension = dimension or settings.feature_dimension
        self.index_type = (index_type or settings.index_type).lower()
        self.product_ids = []
        self.index = self._create_index()

    def _create_index(self):
        """Tạo FAISS index theo cấu hình, dùng Inner Product sau khi chuẩn hoá L2."""
        if self.index_type == "flat":
            return faiss.IndexFlatIP(self.dimension)
        if self.index_type == "hnsw":
            hnsw_m = int(settings.hnsw_m)
            index = faiss.IndexHNSWFlat(self.dimension, hnsw_m, faiss.METRIC_INNER_PRODUCT)
            # Thiết lập efConstruction
            index.hnsw.efConstruction = int(settings.hnsw_efConstruction)
            # efSearch đặt khi truy vấn (nếu cần), nhưng có thể đặt mặc định
            index.hnsw.efSearch = int(settings.hnsw_efSearch)
            return index
        if self.index_type == "ivf_flat":
            nlist = int(settings.ivf_nlist)
            quantizer = faiss.IndexFlatIP(self.dimension)
            index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist, faiss.METRIC_INNER_PRODUCT)
            return index
        # Mặc định về flat
        return faiss.IndexFlatIP(self.dimension)
    
    def add_vectors(self, vectors: np.ndarray, product_ids: List[str]):
        """Thêm vectors vào index, tự train nếu là IVF."""
        if len(vectors) == 0:
            return

        vectors = np.array(vectors).astype('float32')
        # Chuẩn hóa L2 để dùng Inner Product như Cosine
        faiss.normalize_L2(vectors)

        # Train nếu là IVF và chưa train
        if isinstance(self.index, faiss.IndexIVF):
            if not self.index.is_trained:
                self.index.train(vectors)
            # Thiết lập nprobe cho truy vấn sau, không cần khi add
        self.index.add(vectors)
        self.product_ids.extend(product_ids)
    
    def search(self, query_vector: np.ndarray, k: int = 5) -> List[tuple]:
        """Search for similar vectors"""
        if len(self.product_ids) == 0:
            return []
            
        query_vector = query_vector.astype('float32').reshape(1, -1)
        faiss.normalize_L2(query_vector)
        # Thiết lập tham số truy vấn cho HNSW/IVF nếu cần
        if isinstance(self.index, faiss.IndexHNSW):
            self.index.hnsw.efSearch = int(settings.hnsw_efSearch)
        if isinstance(self.index, faiss.IndexIVF):
            self.index.nprobe = int(settings.ivf_nprobe)
        # Đối với IP index, giá trị trả về là độ tương đồng (cosine) trong [-1, 1]
        similarities, indices = self.index.search(query_vector, k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.product_ids) and idx >= 0:
                results.append((self.product_ids[idx], float(similarities[0][i])))
        
        return results
    
    def save_index(self, filepath: str):
        """Lưu index và metadata (product_ids, loại index, tham số)."""
        faiss.write_index(self.index, filepath)
        # Save metadata mapping
        import json
        meta = {
            "product_ids": self.product_ids,
            "dimension": self.dimension,
            "index_type": self.index_type,
            "params": {
                "hnsw_m": int(settings.hnsw_m),
                "hnsw_efConstruction": int(settings.hnsw_efConstruction),
                "hnsw_efSearch": int(settings.hnsw_efSearch),
                "ivf_nlist": int(settings.ivf_nlist),
                "ivf_nprobe": int(settings.ivf_nprobe)
            }
        }
        with open(filepath + '.json', 'w') as f:
            json.dump(meta, f)
    
    def load_index(self, filepath: str):
        """Nạp index và metadata đã lưu."""
        self.index = faiss.read_index(filepath)
        import json
        try:
            with open(filepath + '.json', 'r') as f:
                meta = json.load(f)
            # Tương thích ngược khi file cũ chỉ là list product_ids
            if isinstance(meta, list):
                self.product_ids = meta
                self.index_type = "flat"
                self.dimension = self.index.d
            else:
                self.product_ids = meta.get("product_ids", [])
                self.dimension = meta.get("dimension", self.index.d)
                self.index_type = meta.get("index_type", "flat")
        except Exception:
            # Fallback: cố đọc như danh sách product_ids
            with open(filepath + '.json', 'r') as f:
                self.product_ids = json.load(f)
            self.index_type = "flat"
            self.dimension = self.index.d
    
    def get_index_size(self) -> int:
        """Get number of vectors in index"""
        return self.index.ntotal
    
    def clear_index(self):
        """Clear the index"""
        self.index.reset()
        self.product_ids = []