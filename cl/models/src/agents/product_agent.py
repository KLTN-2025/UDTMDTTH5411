from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from src.models.apparel_mapper import apparel_text_to_feature_dict, apparel_text_to_structured_query
from src.data.mongo import MongoConnection, build_text_price_query


@dataclass
class AgentResponse:
	message: str
	features: Dict[str, Any]
	structured_query: Dict[str, Any]
	results: List[Dict[str, Any]]
	extra: Dict[str, Any]


class FashionClipClient:
	"""Adapter nhỏ gọi embedding ảnh từ module ngoài Embedding_FashionCLIP_failed.
	Yêu cầu biến môi trường FCLIP_URL hoặc đường dẫn nội bộ nếu dùng trực tiếp.
	"""

	def __init__(self, base_url: Optional[str] = None):
		self.base_url = base_url or os.getenv("FCLIP_URL")

	def embed_image(self, image_url: str) -> Optional[List[float]]:
		# Ở đây ta giả định có service REST: POST {base_url}/embed với {"image_url": ...}
		# Nếu không có service, trả None để agent fallback sang search theo text.
		try:
			import requests
			if not self.base_url:
				return None
			resp = requests.post(f"{self.base_url}/embed", json={"image_url": image_url}, timeout=15)
			resp.raise_for_status()
			data = resp.json()
			return data.get("embedding")
		except Exception:
			return None


class ProductAgent:
	def __init__(self, mongo: Optional[MongoConnection] = None, fclip: Optional[FashionClipClient] = None):
		self.mongo = mongo or MongoConnection()
		self.fclip = fclip or FashionClipClient()

	def search_by_text(self, text: str, top_k: int = 20) -> AgentResponse:
		features = apparel_text_to_feature_dict(text)
		sq = apparel_text_to_structured_query(text)
		query = build_text_price_query(sq.name_keywords, sq.price_min, sq.price_max)
		coll = self.mongo.get_collection("fashion-video-app-prd", "products")
		cursor = coll.find(query).limit(int(top_k))
		items: List[Dict[str, Any]] = []
		for doc in cursor:
			items.append({
				"id": str(doc.get("_id")),
				"name": doc.get("name"),
				"price": doc.get("sale_price"),
				"images": doc.get("images", [])[:3],
				"score": None,
			})
		return AgentResponse(
			message="Đã tìm thấy sản phẩm theo truy vấn văn bản.",
			features=features,
			structured_query={
				"text": sq.text,
				"name_keywords": sq.name_keywords,
				"must_terms": sq.must_terms,
				"price_min": sq.price_min,
				"price_max": sq.price_max,
				"sort_by": sq.sort_by,
			},
			results=items,
			extra={"mongo_filter": query},
		)

	def embed_image_and_search(self, image_url: str, fallback_text: Optional[str] = None, top_k: int = 20) -> AgentResponse:
		embedding = self.fclip.embed_image(image_url)
		if embedding is None and fallback_text:
			return self.search_by_text(fallback_text, top_k=top_k)
		# Nếu có embedding, ở đây có thể map sang tìm kiếm vector (chưa có trong hệ thống)
		# Tạm thời: fallback sang tìm tên chứa từ khóa từ URL để demo
		text_hint = fallback_text or ""
		return self.search_by_text(text_hint, top_k=top_k)



