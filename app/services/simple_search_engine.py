import numpy as np
import os
import logging
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from tqdm import tqdm
import time

from app.models.simple_embedder import SimpleEmbedder
from app.models.simple_database import SimpleVectorDatabase, SimpleMongoDBManager
from app.utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class SimpleFashionSearchEngine:
    
    def __init__(self, mongo_uri: str = None, db_name: str = None, 
                 collection_name: str = None, embedder_model: str = None):
        self.mongo_manager = SimpleMongoDBManager(
            mongo_uri or settings.mongo_uri,
            db_name or settings.db_name,
            collection_name or settings.collection_name
        )
        
        self.embedder = SimpleEmbedder(dimension=settings.feature_dimension)
        self.vector_db = SimpleVectorDatabase(dimension=settings.feature_dimension)
        
        # Try to load existing index
        self.load_index()
        
        logger.info("SimpleFashionSearchEngine initialized")
    
    def build_index(self, force: bool = False, index_path: str = None, 
                   batch_size: int = None) -> Dict[str, Any]:
        index_path = index_path or settings.index_path
        batch_size = batch_size or settings.batch_size
        
        if os.path.exists(index_path) and not force:
            logger.info(f"Index already exists at {index_path}. Use --force to rebuild.")
            return self.get_index_stats()
        
        logger.info("Building search index...")
        start_time = time.time()
        
        products = self.mongo_manager.get_products_with_images()
        if not products:
            logger.error("No products found with images")
            return {"error": "No products found with images"}
        
        logger.info(f"Processing {len(products)} products...")
        
        all_vectors = []
        all_product_ids = []
        
        for i in tqdm(range(0, len(products), batch_size), desc="Processing batches"):
            batch = products[i:i + batch_size]
            
            for product in batch:
                try:
                    if 'images' in product and product['images']:
                        image_url = product['images'][0]
                        
                        features = self.embedder.extract_features(None)
                        all_vectors.append(features)
                        all_product_ids.append(str(product['_id']))
                        
                except Exception as e:
                    logger.warning(f"Failed to process product {product.get('_id', 'unknown')}: {e}")
                    continue
        
        if not all_vectors:
            logger.error("No vectors generated")
            return {"error": "No vectors generated"}
        
        self.vector_db.add_vectors(np.array(all_vectors), all_product_ids)
        
        json_path = index_path.replace('.faiss', '.json')
        self.vector_db.save(json_path)
        
        metadata = {
            'total_products': len(all_vectors),
            'dimension': settings.feature_dimension,
            'created_at': datetime.now().isoformat(),
            'build_time_seconds': time.time() - start_time
        }
        
        metadata_path = index_path.replace('.faiss', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Index built successfully: {len(all_vectors)} vectors in {time.time() - start_time:.2f}s")
        
        return {
            'total_vectors': len(all_vectors),
            'build_time_seconds': time.time() - start_time,
            'index_path': index_path,
            'metadata_path': metadata_path
        }
    
    def load_index(self, index_path: str = None) -> bool:
        index_path = index_path or settings.index_path
        
        json_path = index_path.replace('.faiss', '.json')
        if os.path.exists(json_path):
            try:
                self.vector_db.load(json_path)
                logger.info(f"Index loaded successfully: {len(self.vector_db.vectors)} vectors")
                return True
            except Exception as e:
                logger.error(f"Failed to load JSON index: {e}")
        
        if os.path.exists(index_path):
            try:
                self.vector_db.load(index_path)
                logger.info(f"Index loaded successfully: {len(self.vector_db.vectors)} vectors")
                return True
            except Exception as e:
                logger.error(f"Failed to load FAISS index: {e}")
        
        logger.warning(f"No index found at {index_path} or {json_path}")
        return False
    
    def search_by_image_url(self, image_url: str, k: int = 10) -> List[Dict[str, Any]]:
        try:
            query_vector = self.embedder.extract_features(None)
            
            similarities, indices = self.vector_db.search(query_vector, k)
            
            results = []
            for i, (sim, idx) in enumerate(zip(similarities, indices)):
                if idx < len(self.vector_db.product_ids):
                    product_id = self.vector_db.product_ids[idx]
                    product = self.mongo_manager.get_product_by_id(product_id)
                    
                    if product:
                        results.append({
                            'product': product,
                            'similarity': float(sim),
                            'rank': i + 1
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    def search_by_text(self, text: str, k: int = 10) -> List[Dict[str, Any]]:
        try:
            query_vector = self.embedder.encode_text(text)
            
            similarities, indices = self.vector_db.search(query_vector, k)
            
            results = []
            for i, (sim, idx) in enumerate(zip(similarities, indices)):
                if idx < len(self.vector_db.product_ids):
                    product_id = self.vector_db.product_ids[idx]
                    product = self.mongo_manager.get_product_by_id(product_id)
                    
                    if product:
                        results.append({
                            'product': product,
                            'similarity': float(sim),
                            'rank': i + 1
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Text search failed: {e}")
            return []
    
    def get_similar_products(self, product_id: str, k: int = 10) -> List[Dict[str, Any]]:
        try:
            product_idx = None
            for i, pid in enumerate(self.vector_db.product_ids):
                if pid == product_id:
                    product_idx = i
                    break
            
            if product_idx is None:
                logger.warning(f"Product {product_id} not found in index")
                return []
            
            query_vector = self.vector_db.vectors[product_idx]
            
            similarities, indices = self.vector_db.search(query_vector, k + 1)
            
            results = []
            for i, (sim, idx) in enumerate(zip(similarities, indices)):
                if idx != product_idx and idx < len(self.vector_db.product_ids):
                    similar_product_id = self.vector_db.product_ids[idx]
                    product = self.mongo_manager.get_product_by_id(similar_product_id)
                    
                    if product:
                        results.append({
                            'product': product,
                            'similarity': float(sim),
                            'rank': len(results) + 1
                        })
            
            return results[:k]
            
        except Exception as e:
            logger.error(f"Similar products search failed: {e}")
            return []
    
    def search_similar_products_from_bytes(self, image_bytes: bytes, k: int = 10) -> List[Dict[str, Any]]:
        try:
            from PIL import Image
            from io import BytesIO
            
            image = Image.open(BytesIO(image_bytes)).convert('RGB')
            
            query_vector = self.embedder.extract_features(image)
            
            similarities, indices = self.vector_db.search(query_vector, k)
            
            results = []
            for i, (sim, idx) in enumerate(zip(similarities, indices)):
                if idx < len(self.vector_db.product_ids):
                    product_id = self.vector_db.product_ids[idx]
                    product = self.mongo_manager.get_product_by_id(product_id)
                    
                    if product:
                        results.append({
                            "_id": product["_id"],
                            "name": product.get("name", "Unknown Product"),
                            "sale_price": product.get("price", 0),
                            "description": product.get("description", ""),
                            "images": product.get("images", []),
                            "similarity_score": float(sim),
                            "distance": 1.0 - float(sim)
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Search from bytes failed: {e}")
            return []
    
    def search_similar_products_by_text(self, query: str, k: int = 10) -> List[Dict[str, Any]]:
        try:
            query_vector = self.embedder.encode_text(query)
            
            similarities, indices = self.vector_db.search(query_vector, k)
            
            results = []
            for i, (sim, idx) in enumerate(zip(similarities, indices)):
                if idx < len(self.vector_db.product_ids):
                    product_id = self.vector_db.product_ids[idx]
                    product = self.mongo_manager.get_product_by_id(product_id)
                    
                    if product:
                        results.append({
                            "_id": product["_id"],
                            "name": product.get("name", "Unknown Product"),
                            "sale_price": product.get("price", 0),
                            "description": product.get("description", ""),
                            "images": product.get("images", []),
                            "similarity_score": float(sim),
                            "distance": 1.0 - float(sim)
                        })
            
            return results
            
        except Exception as e:
            logger.error(f"Text search failed: {e}")
            return []
    
    def get_index_stats(self) -> Dict[str, Any]:
        return self.vector_db.get_stats()
