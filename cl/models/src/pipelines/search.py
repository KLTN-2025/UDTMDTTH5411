from __future__ import annotations

from dataclasses import asdict
from typing import List, Optional

from src.types import IntentLabel, StructuredQuery, SearchResult, Product
from src.models.intent import IntentDetector
from src.models.query_generation import QueryGenerator
from src.models.embedding import EmbeddingIndex


class ProductSearchPipeline:
	"""Pipeline quyết định dựa trên intent:
	- Nếu intent là GENERATE_QUERY: sinh StructuredQuery rồi truy hồi
	- Nếu intent là SORT/FILTER: áp điều kiện/ sort lên kết quả
	- Mặc định: SEARCH -> truy hồi theo relevance
	"""

	def __init__(self, index: EmbeddingIndex, intent: IntentDetector, generator: QueryGenerator):
		self.index = index
		self.intent = intent
		self.generator = generator

	def _apply_price_filter(self, items: List[SearchResult], price_min: Optional[float], price_max: Optional[float]) -> List[SearchResult]:
		filtered: List[SearchResult] = []
		for r in items:
			p = r.product
			if price_min is not None and p.price < price_min:
				continue
			if price_max is not None and p.price > price_max:
				continue
			filtered.append(r)
		return filtered

	def _apply_sort(self, items: List[SearchResult], sort_by: Optional[str]) -> List[SearchResult]:
		if sort_by == "price_asc":
			return sorted(items, key=lambda r: (r.product.price, -r.score))
		if sort_by == "price_desc":
			return sorted(items, key=lambda r: (-r.product.price, -r.score))
		return items  # relevance mặc định theo score

	def search(self, user_query: str, top_k: int = 20) -> dict:
		intent_res = self.intent.predict(user_query)
		label = intent_res.label

		if label == IntentLabel.GENERATE_QUERY:
			q = self.generator.generate(user_query)
			candidates = self.index.search_products(q.text or user_query, top_k=top_k)
			candidates = self._apply_price_filter(candidates, q.price_min, q.price_max)
			candidates = self._apply_sort(candidates, q.sort_by)
			return {
				"intent": label.value,
				"intent_confidence": intent_res.confidence,
				"structured_query": asdict(q),
				"results": [
					{ "id": r.product.id, "name": r.product.name, "price": r.product.price, "score": r.score }
					for r in candidates
				],
			}

		if label in {IntentLabel.SORT_PRICE_ASC, IntentLabel.SORT_PRICE_DESC, IntentLabel.FILTER_PRICE_HIGH, IntentLabel.FILTER_PRICE_LOW}:
			candidates = self.index.search_products(user_query, top_k=top_k)
			price_min = None
			price_max = None
			if label == IntentLabel.FILTER_PRICE_LOW:
				price_max =  (
					min([p.product.price for p in candidates], default=None)
					if candidates else None
				)
			elif label == IntentLabel.FILTER_PRICE_HIGH:
				price_min = (
					max([p.product.price for p in candidates], default=None)
					if candidates else None
				)
			candidates = self._apply_price_filter(candidates, price_min, price_max)
			sort_by = "price_asc" if label == IntentLabel.SORT_PRICE_ASC else ("price_desc" if label == IntentLabel.SORT_PRICE_DESC else None)
			candidates = self._apply_sort(candidates, sort_by)
			return {
				"intent": label.value,
				"intent_confidence": intent_res.confidence,
				"structured_query": None,
				"results": [
					{ "id": r.product.id, "name": r.product.name, "price": r.product.price, "score": r.score }
					for r in candidates
				],
			}

		# Mặc định: SEARCH
		candidates = self.index.search_products(user_query, top_k=top_k)
		return {
			"intent": label.value,
			"intent_confidence": intent_res.confidence,
			"structured_query": None,
			"results": [
				{ "id": r.product.id, "name": r.product.name, "price": r.product.price, "score": r.score }
				for r in candidates
			],
		}
