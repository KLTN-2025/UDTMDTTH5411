from app.models.fashionclip_embedder import FashionCLIPEmbedder
from app.models.database import VectorDatabase, MongoDBManager
from app.utils.config import get_settings
from typing import List, Optional, Dict, Any
import numpy as np
import logging
from tqdm import tqdm
import time
import os

logger = logging.getLogger(__name__)
settings = get_settings()

class FashionSearchEngine:
    def __init__(self, mongo_uri: str = None, db_name: str = None, 
                 collection_name: str = None, embedder_model: str = None):
        self.mongo_manager = MongoDBManager(
            mongo_uri or settings.mongo_uri,
            db_name or settings.db_name,
            collection_name or settings.collection_name
        )
        
        embedder_model = embedder_model or settings.embedder_model
        logger.info(f"Sử dụng FashionCLIP embedder với model: {settings.fashionclip_model_name}")
        self.embedder = FashionCLIPEmbedder(settings.fashionclip_model_name)
        
        self.vector_db = VectorDatabase(index_type=settings.index_type)
        self.is_index_loaded = False
        try:
            default_index_path = settings.index_path
            if default_index_path and os.path.exists(default_index_path):
                self.load_index(default_index_path)
        except Exception as e:
            logger.warning(f"Auto-load index on init failed: {e}")
    
    def build_index(self, index_path: Optional[str] = None, 
                   batch_size: int = None, force_rebuild: bool = False):
        index_path = index_path or settings.index_path

        if index_path and os.path.exists(index_path) and not force_rebuild:
            logger.info("Loading existing index...")
            self.load_index(index_path)
            return
        
        logger.info("Building vector index from database...")
        
        batch_size = batch_size or settings.batch_size
        total_products = self.mongo_manager.count_products_with_images()
        
        if total_products == 0:
            logger.warning("No products with images found in database")
            return
        
        logger.info(f"Found {total_products} products with images in '{settings.image_field}' field")
        
        all_vectors = []
        all_product_ids = []
        processed_count = 0
        failed_count = 0
        
        product_batches = self.mongo_manager.get_products_with_images(batch_size)
        
        for product_batch in tqdm(product_batches, 
                                 total=(total_products // batch_size) + 1,
                                 desc="Processing product batches"):
            
            batch_vectors = []
            batch_product_ids = []
            batch_image_urls_groups = []
            
            # Prepare batch data
            for product in product_batch:
                image_urls = product.get(settings.image_field, [])
                if isinstance(image_urls, list) and len(image_urls) > 0:
                    limited_urls = image_urls[: max(1, settings.max_images_per_product)]
                    batch_image_urls_groups.append(limited_urls)
                    batch_product_ids.append(str(product["_id"]))
            
            if not batch_image_urls_groups:
                continue
                
            try:
                for product_idx, image_urls in enumerate(batch_image_urls_groups):
                    try:
                        if hasattr(self.embedder, 'batch_extract_features_optimized'):
                            features_list = self.embedder.batch_extract_features_optimized(image_urls)
                        else:
                            features_list = self.embedder.batch_extract_features(image_urls)
                        valid_features = [f for f in features_list if f is not None and len(f) > 0]
                        if not valid_features:
                            failed_count += 1
                            continue
                        avg_vector = np.mean(np.stack(valid_features, axis=0), axis=0)
                        batch_vectors.append(avg_vector)
                        try:
                            self.mongo_manager.update_product_features(
                                batch_product_ids[product_idx],
                                avg_vector.tolist()
                            )
                            processed_count += 1
                        except Exception as e:
                            logger.error(f"Error updating product {batch_product_ids[product_idx]}: {e}")
                            failed_count += 1
                    except Exception as e:
                        logger.error(f"Failed processing product index {product_idx}: {e}")
                        failed_count += 1
                
                if batch_vectors:
                    all_vectors.extend(batch_vectors)
                    all_product_ids.extend(batch_product_ids[:len(batch_vectors)])
                
            except Exception as e:
                logger.error(f"Error processing batch: {e}")
                failed_count += len(batch_image_urls)
                continue
            
            time.sleep(0.1)
        
        if all_vectors:
            all_vectors_np = np.array(all_vectors).astype('float32')
            
            self.vector_db = VectorDatabase(dimension=all_vectors_np.shape[1], index_type=settings.index_type)
            self.vector_db.add_vectors(all_vectors_np, all_product_ids)
            self.is_index_loaded = True
            
            if index_path:
                os.makedirs(os.path.dirname(index_path), exist_ok=True)
                self.vector_db.save_index(index_path)
            
            logger.info(f"Index built with {len(all_vectors)} vectors")
            logger.info(f"Processed: {processed_count}, Failed: {failed_count}")
            
            self.mongo_manager.create_feature_index()
        else:
            logger.warning("No vectors were processed")
    
    def load_index(self, index_path: str):
        if not os.path.exists(index_path):
            logger.error(f"Index file not found: {index_path}")
            return False
        
        try:
            self.vector_db.load_index(index_path)
            self.is_index_loaded = True
            logger.info(f"Index loaded with {self.vector_db.get_index_size()} products")
            return True
        except Exception as e:
            logger.error(f"Error loading index: {e}")
            return False
    
    def search_similar_products(self, image_url: str, k: int = 5, min_similarity: float = None) -> List[dict]:
        if not self.is_index_loaded:
            logger.warning("Index not loaded, building now...")
            self.build_index()
        
        try:
            image = self.embedder.load_image_from_url(image_url)
            query_features = self.embedder.extract_features(image)
            
            # Nếu có min_similarity và >= 0.75, tìm kiếm không giới hạn
            if min_similarity and min_similarity >= 0.75:
                # Tìm kiếm tất cả vectors để lọc theo độ tương tự
                similar_items = self.vector_db.search(query_features, self.vector_db.index.ntotal)
            else:
                # Tìm kiếm bình thường với giới hạn k
                similar_items = self.vector_db.search(query_features, k)
            
            results = []
            for product_id, similarity in similar_items:
                similarity_score = (similarity + 1.0) / 2.0
                
                # Lọc theo độ tương tự tối thiểu nếu có
                if min_similarity and similarity_score < min_similarity:
                    continue
                    
                product = self.mongo_manager.get_product_by_id(product_id)
                if product:
                    product['similarity_score'] = float(similarity_score)
                    product['distance'] = float(1.0 - similarity_score)
                    results.append(product)
            
            results = self._rerank_results(results)
            return results
            
        except Exception as e:
            logger.error(f"Error in search: {e}")
            return []
    
    def search_similar_products_from_bytes(self, image_bytes: bytes, k: int = 5, min_similarity: float = None) -> List[dict]:
        if not self.is_index_loaded:
            logger.warning("Index not loaded, building now...")
            self.build_index()
        try:
            image = self.embedder.load_image_from_bytes(image_bytes)
            query_features = self.embedder.extract_features(image)
            
            # Nếu có min_similarity và >= 0.75, tìm kiếm không giới hạn
            if min_similarity and min_similarity >= 0.75:
                # Tìm kiếm tất cả vectors để lọc theo độ tương tự
                similar_items = self.vector_db.search(query_features, self.vector_db.index.ntotal)
            else:
                # Tìm kiếm bình thường với giới hạn k
                similar_items = self.vector_db.search(query_features, k)
            
            results = []
            for product_id, similarity in similar_items:
                similarity_score = (similarity + 1.0) / 2.0
                
                # Lọc theo độ tương tự tối thiểu nếu có
                if min_similarity and similarity_score < min_similarity:
                    continue
                    
                product = self.mongo_manager.get_product_by_id(product_id)
                if product:
                    product['similarity_score'] = float(similarity_score)
                    product['distance'] = float(1.0 - similarity_score)
                    results.append(product)
            results = self._rerank_results(results)
            return results
        except Exception as e:
            logger.error(f"Error in search from bytes: {e}")
            return []
    def search_similar_to_product(self, product_id: str, k: int = 5) -> List[dict]:
        """Search for products similar to a specific product"""
        product = self.mongo_manager.get_product_by_id(product_id)
        if not product or 'features' not in product:
            logger.warning(f"Product {product_id} not found or has no features")
            return []
        
        query_features = np.array(product['features']).astype('float32')
        similar_items = self.vector_db.search(query_features, k + 1)  # +1 to exclude self
        
        results = []
        for similar_id, similarity in similar_items:
            if similar_id != product_id:  # Exclude the query product itself
                similar_product = self.mongo_manager.get_product_by_id(similar_id)
                if similar_product:
                    similarity_score = (similarity + 1.0) / 2.0
                    similar_product['similarity_score'] = float(similarity_score)
                    similar_product['distance'] = float(1.0 - similarity_score)
                    results.append(similar_product)
        
        results = self._rerank_results(results)
        return results[:k]
    
    def get_index_stats(self) -> Dict[str, Any]:
        return {
            "index_loaded": self.is_index_loaded,
            "num_products": self.vector_db.get_index_size() if self.is_index_loaded else 0,
            "dimension": self.vector_db.dimension if self.is_index_loaded else 0,
            "database": settings.db_name,
            "collection": settings.collection_name,
            "image_field": settings.image_field
        }
    
    def get_sample_products(self, limit: int = 5) -> List[dict]:
        return self.mongo_manager.get_random_products_with_images(limit)

    def search_products_by_text(self, query: str, k: int = 5) -> List[dict]:
        try:
            products = self.mongo_manager.search_products_by_text(query, k)
            return products
        except Exception:
            return []
    
    def search_similar_products_by_text(self, text_query: str, k: int = 5, min_similarity: float = None) -> List[dict]:
        if not self.is_index_loaded:
            logger.warning("Index not loaded, building now...")
            self.build_index()
        
        
        try:
            text_features = self.embedder.extract_text_features(text_query)
            
            # Nếu có min_similarity và >= 0.75, tìm kiếm không giới hạn
            if min_similarity and min_similarity >= 0.75:
                # Tìm kiếm tất cả vectors để lọc theo độ tương tự
                similar_items = self.vector_db.search(text_features, self.vector_db.index.ntotal)
            else:
                # Tìm kiếm bình thường với giới hạn k
                similar_items = self.vector_db.search(text_features, k)
            
            results = []
            for product_id, similarity in similar_items:
                similarity_score = (similarity + 1.0) / 2.0
                
                # Lọc theo độ tương tự tối thiểu nếu có
                if min_similarity and similarity_score < min_similarity:
                    continue
                    
                product = self.mongo_manager.get_product_by_id(product_id)
                if product:
                    product['similarity_score'] = float(similarity_score)
                    product['distance'] = float(1.0 - similarity_score)
                    results.append(product)
            
            results = self._rerank_results(results)
            return results
            
        except Exception as e:
            logger.error(f"Error in text similarity search: {e}")
            return []

    def _rerank_results(self, results: List[dict]) -> List[dict]:
        if not results:
            return results
        if not getattr(settings, 'rerank_enabled', True):
            results.sort(key=lambda x: x.get('similarity_score', 0.0), reverse=True)
            return results

        def get_price(p: dict) -> float:
            return float(p.get('sale_price', p.get('price', 0)) or 0)

        sorted_by_sim = sorted(results, key=lambda x: x.get('similarity_score', 0.0), reverse=True)
        top_for_price = sorted_by_sim[: max(3, min(10, len(sorted_by_sim)))]
        prices = [get_price(p) for p in top_for_price if get_price(p) > 0]
        if not prices:
            results.sort(key=lambda x: x.get('similarity_score', 0.0), reverse=True)
            return results

        target_price = float(np.median(prices))
        tolerance = max(1e-6, float(getattr(settings, 'rerank_price_tolerance', 0.3)))
        w_sim = float(getattr(settings, 'rerank_weight_similarity', 0.85))
        w_price = float(getattr(settings, 'rerank_weight_price', 0.15))
        def price_score_fn(price: float) -> float:
            if price <= 0 or target_price <= 0:
                return 0.0
            ratio = abs(np.log((price + 1e-6) / (target_price + 1e-6)))
            return float(np.exp(- ratio / max(1e-6, tolerance)))  # trong (0,1]

        reranked = []
        for p in results:
            sim = float(p.get('similarity_score', 0.0))
            pr = get_price(p)
            ps = price_score_fn(pr)
            final = w_sim * sim + w_price * ps
            p['final_score'] = final
            reranked.append(p)

        reranked.sort(key=lambda x: x.get('final_score', x.get('similarity_score', 0.0)), reverse=True)
        for p in reranked:
            score = float(p.get('final_score', p.get('similarity_score', 0.0)))
            p['distance'] = float(1.0 - max(0.0, min(1.0, score)))
        return reranked