from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from pymongo import MongoClient
from pymongo.collection import Collection


class MongoConnection:
	"""Kết nối MongoDB đơn giản, lấy database và collection theo tên."""

	def __init__(self, uri: Optional[str] = None):
		self.uri = uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
		self.client = MongoClient(self.uri)

	def get_collection(self, db_name: str, collection_name: str) -> Collection:
		return self.client[db_name][collection_name]


def build_text_price_query(name_keywords: List[str], price_min: Optional[float], price_max: Optional[float]) -> Dict[str, Any]:
	"""Tạo filter Mongo theo từ khóa tên/description và khoảng giá sale_price.
	- name_keywords: áp dụng tìm kiếm fuzzy đơn giản bằng $regex OR trên name và description
	- price_min/max: so sánh trường sale_price
	"""
	filters: List[Dict[str, Any]] = []
	if name_keywords:
		regex_or: List[Dict[str, Any]] = []
		for kw in name_keywords:
			regex_or.append({"name": {"$regex": kw, "$options": "i"}})
			regex_or.append({"description": {"$regex": kw, "$options": "i"}})
		filters.append({"$or": regex_or})

	price_cond: Dict[str, Any] = {}
	if price_min is not None:
		price_cond["$gte"] = price_min
	if price_max is not None:
		price_cond["$lte"] = price_max
	if price_cond:
		filters.append({"sale_price": price_cond})

	if not filters:
		return {}
	return {"$and": filters} if len(filters) > 1 else filters[0]


