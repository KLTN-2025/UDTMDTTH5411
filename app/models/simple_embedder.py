"""
Simple embedder that bypasses FashionCLIP/torch dependencies for testing
"""
import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)

class SimpleEmbedder:
    """Simple embedder that creates random vectors for testing"""
    
    def __init__(self, dimension: int = 512):
        self.dimension = dimension
        logger.info(f"SimpleEmbedder initialized with dimension {dimension}")
    
    def extract_features(self, image) -> np.ndarray:
        """Extract features from image - create diverse vectors based on image properties"""
        # Create diverse vectors based on image properties
        if hasattr(image, 'size'):
            # Use image size to create deterministic but diverse vectors
            width, height = image.size
            seed = hash((width, height)) % 1000000
            np.random.seed(seed)
        else:
            # For non-image inputs, use current time
            import time
            seed = int(time.time() * 1000) % 1000000
            np.random.seed(seed)
        
        # Create vector with some structure
        features = np.random.randn(self.dimension).astype('float32')
        
        # Add some patterns to make vectors more diverse
        for i in range(0, self.dimension, 64):
            features[i:i+32] *= 1.5  # Emphasize certain dimensions
        for i in range(32, self.dimension, 64):
            features[i:i+32] *= 0.8  # De-emphasize others
            
        # Normalize
        features = features / np.linalg.norm(features)
        return features
    
    def batch_extract_features(self, image_urls: List[str]) -> List[np.ndarray]:
        """Extract features from multiple images"""
        features = []
        for i, url in enumerate(image_urls):
            try:
                # Create diverse features based on URL and index
                url_hash = hash(url) % 1000000
                np.random.seed(url_hash + i)
                
                # Create vector with patterns
                feature = np.random.randn(self.dimension).astype('float32')
                
                # Add category-like patterns based on URL
                if 'shirt' in url.lower() or 'ao' in url.lower():
                    feature[:128] *= 1.2  # Emphasize first 128 dimensions for shirts
                elif 'pant' in url.lower() or 'quan' in url.lower():
                    feature[128:256] *= 1.2  # Emphasize middle dimensions for pants
                elif 'shoe' in url.lower() or 'giay' in url.lower():
                    feature[256:384] *= 1.2  # Emphasize later dimensions for shoes
                else:
                    feature[384:512] *= 1.2  # Default pattern for other items
                
                # Add color patterns based on URL hash
                color_pattern = (url_hash % 4) * 128
                feature[color_pattern:color_pattern+64] *= 1.3
                
                # Normalize
                feature = feature / np.linalg.norm(feature)
                features.append(feature)
            except Exception as e:
                logger.warning(f"Failed to extract features from {url}: {e}")
                # Add zero vector as fallback
                zero_feature = np.zeros(self.dimension, dtype='float32')
                features.append(zero_feature)
        return features
    
    def encode_text(self, text: str) -> np.ndarray:
        """Encode text to vector"""
        # Create vector based on text content
        text_hash = hash(text) % 1000000
        np.random.seed(text_hash)
        
        # Create base vector
        features = np.random.randn(self.dimension).astype('float32')
        
        # Add semantic patterns based on text content
        text_lower = text.lower()
        
        # Color patterns
        if any(color in text_lower for color in ['red', 'đỏ', 'rouge']):
            features[:64] *= 1.4
        elif any(color in text_lower for color in ['blue', 'xanh', 'bleu']):
            features[64:128] *= 1.4
        elif any(color in text_lower for color in ['green', 'xanh lá', 'vert']):
            features[128:192] *= 1.4
        elif any(color in text_lower for color in ['black', 'đen', 'noir']):
            features[192:256] *= 1.4
        elif any(color in text_lower for color in ['white', 'trắng', 'blanc']):
            features[256:320] *= 1.4
        
        # Category patterns
        if any(cat in text_lower for cat in ['shirt', 'áo', 'blouse', 'top']):
            features[320:384] *= 1.3
        elif any(cat in text_lower for cat in ['pant', 'quần', 'jean', 'trouser']):
            features[384:448] *= 1.3
        elif any(cat in text_lower for cat in ['shoe', 'giày', 'sandal', 'boot']):
            features[448:512] *= 1.3
        
        # Style patterns
        if any(style in text_lower for style in ['casual', 'thường', 'everyday']):
            features[0:128] *= 1.1
        elif any(style in text_lower for style in ['formal', 'lịch sự', 'business']):
            features[128:256] *= 1.1
        elif any(style in text_lower for style in ['sport', 'thể thao', 'gym']):
            features[256:384] *= 1.1
        elif any(style in text_lower for style in ['elegant', 'thanh lịch', 'chic']):
            features[384:512] *= 1.1
        
        # Normalize
        features = features / np.linalg.norm(features)
        return features
