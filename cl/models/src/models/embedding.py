from typing import List, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer

from src.types import Product, SearchResult


class EmbeddingIndex:
	"""Chỉ mục embedding đơn giản dùng cosine similarity.
	- Mã hoá: name + description kết hợp
	- Truy vấn: encode chuỗi truy vấn, so khớp cosine
	"""

	def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", device: str = "cpu"):
		self.encoder = SentenceTransformer(model_name, device=device)
		self.ids: List[str] = []
		self.embeddings: np.ndarray | None = None
		self.products: List[Product] = []

	def build(self, products: List[Product], batch_size: int = 64) -> None:
		self.products = products
		self.ids = [p.id for p in products]
		texts = [f"{p.name} [SEP] {p.description}" for p in products]
		emb_list: List[np.ndarray] = []
		for i in range(0, len(texts), batch_size):
			batch = texts[i : i + batch_size]
			emb = self.encoder.encode(batch, convert_to_numpy=True, normalize_embeddings=True)
			emb_list.append(emb)
		self.embeddings = np.concatenate(emb_list, axis=0) if emb_list else np.zeros((0, 384), dtype=np.float32)

	def search(self, query: str, top_k: int = 10) -> List[Tuple[int, float]]:
		if self.embeddings is None or self.embeddings.shape[0] == 0:
			return []
		q = self.encoder.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
		scores = (self.embeddings @ q).astype(np.float32)  # cosine nhờ normalize
		idxs = np.argpartition(-scores, kth=min(top_k, len(scores) - 1))[:top_k]
		idxs = idxs[np.argsort(-scores[idxs])]
		return [(int(i), float(scores[i])) for i in idxs]

	def search_products(self, query: str, top_k: int = 10) -> List[SearchResult]:
		pairs = self.search(query, top_k)
		return [SearchResult(product=self.products[i], score=s) for i, s in pairs]
