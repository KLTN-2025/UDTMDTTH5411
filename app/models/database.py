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
        if isinstance(product_id, ObjectId):
            return product_id
        if isinstance(product_id, str):
            try:
                return ObjectId(product_id)
            except Exception:
                return product_id
        return product_id
    
    def get_all_products(self, batch_size: int = 1000) -> Generator[List[dict], None, None]:
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
            if settings.image_field in product and product[settings.image_field]:
                batch.append(product)
                if len(batch) >= batch_size:
                    yield batch
                    batch = []
        
        if batch:
            yield batch
    
    def count_products_with_images(self) -> int:
        query = {
            settings.image_field: {
                "$exists": True, 
                "$ne": [],
                "$not": {"$size": 0}
            }
        }
        return self.products_collection.count_documents(query)
    
    def update_product_features(self, product_id: str, features: List[float]):
        self.products_collection.update_one(
            {"_id": self._ensure_object_id(product_id)},
            {"$set": {"features": features, "updated_at": datetime.now()}}
        )
    
    def get_product_by_id(self, product_id: str) -> Optional[dict]:
        return self.products_collection.find_one({"_id": self._ensure_object_id(product_id)})
    
    def get_products_by_ids(self, product_ids: List[str]) -> List[dict]:
        object_ids = [self._ensure_object_id(pid) for pid in product_ids]
        return list(self.products_collection.find({"_id": {"$in": object_ids}}))
    
    def create_feature_index(self):
        self.products_collection.create_index("features")
    
    def get_random_products_with_images(self, limit: int = 10) -> List[dict]:
        pipeline = [
            {"$match": {settings.image_field: {"$exists": True, "$ne": []}}},
            {"$sample": {"size": limit}}
        ]
        return list(self.products_collection.aggregate(pipeline))

    def search_products_by_text(self, query: str, limit: int = 5) -> List[dict]:
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
        if self.index_type == "flat":
            return faiss.IndexFlatIP(self.dimension)
        if self.index_type == "hnsw":
            hnsw_m = int(settings.hnsw_m)
            index = faiss.IndexHNSWFlat(self.dimension, hnsw_m, faiss.METRIC_INNER_PRODUCT)
            index.hnsw.efConstruction = int(settings.hnsw_efConstruction)
            index.hnsw.efSearch = int(settings.hnsw_efSearch)
            return index
        if self.index_type == "ivf_flat":
            nlist = int(settings.ivf_nlist)
            quantizer = faiss.IndexFlatIP(self.dimension)
            index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist, faiss.METRIC_INNER_PRODUCT)
            return index
        return faiss.IndexFlatIP(self.dimension)
    
    def add_vectors(self, vectors: np.ndarray, product_ids: List[str]):
        if len(vectors) == 0:
            return

        vectors = np.array(vectors).astype('float32')
        faiss.normalize_L2(vectors)

        if isinstance(self.index, faiss.IndexIVF):
            if not self.index.is_trained:
                self.index.train(vectors)
        self.index.add(vectors)
        self.product_ids.extend(product_ids)
    
    def search(self, query_vector: np.ndarray, k: int = 5) -> List[tuple]:
        if len(self.product_ids) == 0:
            return []
            
        query_vector = query_vector.astype('float32').reshape(1, -1)
        faiss.normalize_L2(query_vector)
        if isinstance(self.index, faiss.IndexHNSW):
            self.index.hnsw.efSearch = int(settings.hnsw_efSearch)
        if isinstance(self.index, faiss.IndexIVF):
            self.index.nprobe = int(settings.ivf_nprobe)
        similarities, indices = self.index.search(query_vector, k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.product_ids) and idx >= 0:
                results.append((self.product_ids[idx], float(similarities[0][i])))
        
        return results
    
    def save_index(self, filepath: str):
        faiss.write_index(self.index, filepath)
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
        self.index = faiss.read_index(filepath)
        import json
        try:
            with open(filepath + '.json', 'r') as f:
                meta = json.load(f)
            if isinstance(meta, list):
                self.product_ids = meta
                self.index_type = "flat"
                self.dimension = self.index.d
            else:
                self.product_ids = meta.get("product_ids", [])
                self.dimension = meta.get("dimension", self.index.d)
                self.index_type = meta.get("index_type", "flat")
        except Exception:
            with open(filepath + '.json', 'r') as f:
                self.product_ids = json.load(f)
            self.index_type = "flat"
            self.dimension = self.index.d
    
    def get_index_size(self) -> int:
        return self.index.ntotal
    
    def clear_index(self):
        self.index.reset()
        self.product_ids = []