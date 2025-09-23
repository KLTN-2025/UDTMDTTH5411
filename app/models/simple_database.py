import numpy as np
import json
import os
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class SimpleVectorDatabase:
    
    def __init__(self, dimension: int = 512):
        self.dimension = dimension
        self.vectors = []
        self.product_ids = []
        logger.info(f"SimpleVectorDatabase initialized with dimension {dimension}")
    
    def add_vectors(self, vectors: np.ndarray, product_ids: List[str]):
        if len(vectors) == 0:
            return
        
        vectors = np.array(vectors).astype('float32')
        if vectors.ndim == 1:
            vectors = vectors.reshape(1, -1)
        
        for i, vector in enumerate(vectors):
            if len(vector) == self.dimension:
                self.vectors.append(vector)
                self.product_ids.append(product_ids[i] if i < len(product_ids) else f"product_{len(self.vectors)}")
    
    def search(self, query_vector: np.ndarray, k: int = 10) -> tuple:
        if len(self.vectors) == 0:
            return np.array([]), np.array([])
        
        vectors = np.array(self.vectors)
        query_vector = query_vector.reshape(1, -1)
        
        similarities = np.dot(vectors, query_vector.T).flatten()
        
        top_indices = np.argsort(similarities)[::-1][:k]
        
        return similarities[top_indices], top_indices
    
    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        data = {
            'vectors': [v.tolist() for v in self.vectors],
            'product_ids': self.product_ids,
            'dimension': self.dimension
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f)
        
        logger.info(f"Saved {len(self.vectors)} vectors to {filepath}")
    
    def load(self, filepath: str):
        if not os.path.exists(filepath):
            logger.warning(f"File {filepath} does not exist")
            return
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        self.vectors = [np.array(v) for v in data['vectors']]
        self.product_ids = data['product_ids']
        self.dimension = data['dimension']
        
        logger.info(f"Loaded {len(self.vectors)} vectors from {filepath}")
    
    def get_stats(self) -> Dict[str, Any]:
        return {
            'total_vectors': len(self.vectors),
            'dimension': self.dimension,
            'memory_usage_mb': len(self.vectors) * self.dimension * 4 / (1024 * 1024)
        }

class SimpleMongoDBManager:
    
    def __init__(self, mongo_uri: str, db_name: str, collection_name: str):
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.collection_name = collection_name
        self.client = None
        self.db = None
        self.collection = None
        
        try:
            self.client = MongoClient(mongo_uri)
            self.db = self.client[db_name]
            self.collection = self.db[collection_name]
            logger.info(f"Connected to MongoDB: {db_name}.{collection_name}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
    
    def get_products_with_images(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            query = {"images": {"$exists": True, "$not": {"$size": 0}}}
            cursor = self.collection.find(query)
            
            if limit:
                cursor = cursor.limit(limit)
            
            products = list(cursor)
            logger.info(f"Found {len(products)} products with images")
            return products
        except Exception as e:
            logger.error(f"Failed to get products: {e}")
            return []
    
    def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        try:
            if isinstance(product_id, str) and len(product_id) == 24:
                product_id = ObjectId(product_id)
            return self.collection.find_one({"_id": product_id})
        except Exception as e:
            logger.error(f"Failed to get product {product_id}: {e}")
            return None
    
    def close(self):
        if self.client:
            self.client.close()