import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)

class SimpleEmbedder:
    
    def __init__(self, dimension: int = 512):
        self.dimension = dimension
        logger.info(f"SimpleEmbedder initialized with dimension {dimension}")
        
    def extract_features(self, image) -> np.ndarray:
        if hasattr(image, 'size'):
            width, height = image.size
            seed = hash((width, height)) % 1000000
            np.random.seed(seed)
        else:
            import time
            seed = int(time.time() * 1000) % 1000000
            np.random.seed(seed)
        
        features = np.random.randn(self.dimension).astype('float32')
        
        for i in range(0, self.dimension, 64):
            features[i:i+32] *= 1.5
        for i in range(32, self.dimension, 64):
            features[i:i+32] *= 0.8
            
        features = features / np.linalg.norm(features)
        return features
    
    def batch_extract_features(self, image_urls: List[str]) -> List[np.ndarray]:
        features = []
        for i, url in enumerate(image_urls):
            try:
                url_hash = hash(url) % 1000000
                np.random.seed(url_hash + i)
                
                feature = np.random.randn(self.dimension).astype('float32')
                
                if 'shirt' in url.lower() or 'ao' in url.lower():
                    feature[:128] *= 1.2
                elif 'pant' in url.lower() or 'quan' in url.lower():
                    feature[128:256] *= 1.2
                elif 'shoe' in url.lower() or 'giay' in url.lower():
                    feature[256:384] *= 1.2
                else:
                    feature[384:512] *= 1.2
                
                color_pattern = (url_hash % 4) * 128
                feature[color_pattern:color_pattern+64] *= 1.3
                
                feature = feature / np.linalg.norm(feature)
                features.append(feature)
            except Exception as e:
                logger.warning(f"Failed to extract features from {url}: {e}")
                zero_feature = np.zeros(self.dimension, dtype='float32')
                features.append(zero_feature)
        return features
    
    def encode_text(self, text: str) -> np.ndarray:
        text_hash = hash(text) % 1000000
        np.random.seed(text_hash)

        features = np.random.randn(self.dimension).astype('float32')
        
        text_lower = text.lower()
        
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
        
        if any(cat in text_lower for cat in ['shirt', 'áo', 'blouse', 'top']):
            features[320:384] *= 1.3
        elif any(cat in text_lower for cat in ['pant', 'quần', 'jean', 'trouser']):
            features[384:448] *= 1.3
        elif any(cat in text_lower for cat in ['shoe', 'giày', 'sandal', 'boot']):
            features[448:512] *= 1.3
        
        if any(style in text_lower for style in ['casual', 'thường', 'everyday']):
            features[0:128] *= 1.1
        elif any(style in text_lower for style in ['formal', 'lịch sự', 'business']):
            features[128:256] *= 1.1
        elif any(style in text_lower for style in ['sport', 'thể thao', 'gym']):
            features[256:384] *= 1.1
        elif any(style in text_lower for style in ['elegant', 'thanh lịch', 'chic']):
            features[384:512] *= 1.1
        
        features = features / np.linalg.norm(features)
        return features
