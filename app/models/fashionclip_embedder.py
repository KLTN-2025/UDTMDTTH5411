import torch
import numpy as np
from PIL import Image, ImageFile
import requests
from io import BytesIO
import logging
from typing import List, Optional
import time
import concurrent.futures
from fashion_clip import fashion_clip
from app.utils.config import get_settings
from app.models.detector import FashionObjectDetector

logger = logging.getLogger(__name__)
settings = get_settings()
# Cho phép đọc ảnh bị truncated để tránh crash khi dữ liệu lỗi
ImageFile.LOAD_TRUNCATED_IMAGES = True

class FashionCLIPEmbedder:
    def __init__(self, model_name: str = "fashion-clip", device: str = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model_name = model_name
        self.model = self._load_model()

        self.use_detection = bool(settings.use_object_detection)
        self.detector: Optional[FashionObjectDetector] = None
        if self.use_detection:
            try:
                self.detector = FashionObjectDetector(
                    device=self.device,
                    min_confidence=settings.detection_min_conf,
                )
            except Exception as e:
                logger.warning(f"Không khởi tạo được detector, fallback toàn ảnh: {e}")
                self.use_detection = False
        
    def _load_model(self):
        try:
            model = fashion_clip.FashionCLIP(self.model_name)
            logger.info(f"FashionCLIP model loaded successfully: {self.model_name}")
            return model
        except Exception as e:
            logger.error(f"Error loading FashionCLIP model {self.model_name}: {e}")
            raise
    
    def load_image_from_url(self, url: str) -> Image.Image:
        allowed_ext = (".jpg", ".jpeg", ".png")
        lower_url = url.lower().split('?')[0]
        if not lower_url.endswith(allowed_ext):
            raise ValueError(f"URL không phải ảnh hợp lệ (.jpg/.jpeg/.png): {url}")
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                content_type = response.headers.get('Content-Type', '')
                if content_type and not content_type.startswith('image/'):
                    raise ValueError(f"Content-Type không phải image/*: {content_type}")
                img = Image.open(BytesIO(response.content))
                return img.convert('RGB')
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Error loading image from {url} after {max_retries} attempts: {e}")
                    raise
                time.sleep(1)  # Wait before retrying
    
    def load_image_from_bytes(self, data: bytes) -> Image.Image:
        try:
            img = Image.open(BytesIO(data))
            return img.convert('RGB')
        except Exception as e:
            logger.error(f"Lỗi đọc ảnh từ bytes: {e}")
            raise
    
    def _crop_by_detection(self, image: Image.Image) -> Image.Image:
        if not self.use_detection or self.detector is None:
            return image
        try:
            width, height = image.size
            boxes = self.detector.detect(image)
            box = self.detector.choose_product_box((width, height), boxes)
            if box is None:
                return image
            pad_ratio = float(settings.detection_padding_ratio)
            x1, y1, x2, y2 = self.detector.apply_padding((width, height), box, pad_ratio)
            return image.crop((x1, y1, x2, y2))
        except Exception as e:
            logger.warning(f"Detection failed, dùng toàn ảnh. Lý do: {e}")
            return image

    def extract_features(self, image: Image.Image) -> np.ndarray:
        try:
            focused_image = self._crop_by_detection(image)
            
            images = [focused_image]
            if hasattr(self.model, 'encode_image'):
                features = self.model.encode_image(images, batch_size=1)
            elif hasattr(self.model, 'encode_images'):
                features = self.model.encode_images(images, batch_size=1)
            elif hasattr(self.model, 'get_image_features'):
                features = self.model.get_image_features(images)
            else:
                raise AttributeError("FashionCLIP model has no image encoding method")
            
            features = features / np.linalg.norm(features, axis=1, keepdims=True)
            
            features = features[0].flatten()
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features with FashionCLIP: {e}")
            raise
    
    def batch_extract_features(self, image_urls: List[str]) -> List[np.ndarray]:
        features_list = []
        for url in image_urls:
            try:
                image = self.load_image_from_url(url)
                features = self.extract_features(image)
                features_list.append(features)
                logger.debug(f"Successfully extracted features from {url}")
            except Exception as e:
                logger.error(f"Failed to process {url}: {e}")
                features_list.append(None)
        return features_list
    
    def batch_extract_features_optimized(self, image_urls: List[str], batch_size: int = 32) -> List[np.ndarray]:
        features_list = [None] * len(image_urls)
        
        for i in range(0, len(image_urls), batch_size):
            batch_urls = image_urls[i:i+batch_size]
            batch_indices = list(range(i, min(i + batch_size, len(image_urls))))
            
            try:
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    batch_images = list(executor.map(self.load_image_from_url, batch_urls))
                
                processed_images = []
                for image in batch_images:
                    if image is not None:
                        processed_images.append(self._crop_by_detection(image))
                    else:
                        processed_images.append(None)
                
                valid_indices = []
                valid_images = []
                for j, image in enumerate(processed_images):
                    if image is not None:
                        valid_indices.append(batch_indices[j])
                        valid_images.append(image)
                
                if valid_images:
                    with torch.no_grad():
                        if hasattr(self.model, 'encode_image'):
                            batch_features = self.model.encode_image(valid_images, batch_size=len(valid_images))
                        elif hasattr(self.model, 'encode_images'):
                            batch_features = self.model.encode_images(valid_images, batch_size=len(valid_images))
                        elif hasattr(self.model, 'get_image_features'):
                            batch_features = self.model.get_image_features(valid_images)
                        else:
                            raise AttributeError("FashionCLIP model has no image encoding method")
                    
                    batch_features = batch_features / np.linalg.norm(batch_features, axis=1, keepdims=True)
                    
                    if hasattr(batch_features, 'cpu'):
                        batch_features = batch_features.cpu().numpy()
                    else:
                        batch_features = np.asarray(batch_features)
                    
                    for k, idx in enumerate(valid_indices):
                        features_list[idx] = batch_features[k].flatten()
                
                logger.debug(f"Processed batch {i//batch_size + 1}/{(len(image_urls)-1)//batch_size + 1}")
                
            except Exception as e:
                logger.error(f"Error processing batch starting at index {i}: {e}")
                continue
        
        return features_list
    
    def extract_text_features(self, text: str) -> np.ndarray:
        try:
            if hasattr(self.model, 'encode_text'):
                text_features = self.model.encode_text([text], batch_size=1)
            elif hasattr(self.model, 'get_text_features'):
                text_features = self.model.get_text_features([text])
            else:
                raise AttributeError("FashionCLIP model has no text encoding method")
            text_features = text_features / np.linalg.norm(text_features, axis=1, keepdims=True)
            return text_features[0].flatten()
        except Exception as e:
            logger.error(f"Error extracting text features with FashionCLIP: {e}")
            raise
    
    def get_feature_dimension(self) -> int:
        return 512
