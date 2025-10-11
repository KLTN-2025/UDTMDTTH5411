from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from transformers import pipeline

from src.models.apparel_extractor import parse_price_advanced, PriceQuery


_DEFAULT_MODEL = "joeddav/xlm-roberta-large-xnli"


@dataclass
class NLIAttributes:
	category: Optional[str]
	gender: Optional[str]
	sleeve: Optional[str]
	season: Optional[str]
	fit: Optional[str]
	color: Optional[str]
	price: PriceQuery
	scores: Dict[str, float]


class ZeroShotVIExtractor:
	"""Extractor dùng zero-shot NLI đa ngữ để gán nhãn cho câu truy vấn tiếng Việt.
	Dùng template tiếng Việt để tăng độ phù hợp ngôn ngữ.
	"""

	def __init__(self, model_name: str = _DEFAULT_MODEL, device: int = -1):
		self.clf = pipeline("zero-shot-classification", model=model_name, device=device)
		self.labels = {
			"category": [
				"áo thun", "áo polo", "áo sơ mi", "áo khoác", "áo len", "áo cardigan",
				"váy", "chân váy", "quần jean", "quần short", "giày sneaker", "giày cao gót",
			],
			"gender": ["nam", "nữ", "unisex"],
			"sleeve": ["ngắn tay", "dài tay"],
			"season": ["mùa hè", "mùa đông"],
			"fit": ["form rộng", "form ôm"],
			"color": ["đen", "trắng", "xám", "xanh", "đỏ"],
		}

	def _classify(self, text: str, group: str) -> Optional[str]:
		cands = self.labels[group]
		out = self.clf(
			sequences=text,
			candidate_labels=cands,
			hypothesis_template="Trong câu này có nhắc đến {}.",
			multi_label=False,
		)
		label = out["labels"][0]
		return label

	def extract(self, text: str) -> NLIAttributes:
		cat = self._classify(text, "category")
		gender = self._classify(text, "gender")
		sleeve = self._classify(text, "sleeve")
		season = self._classify(text, "season")
		fit = self._classify(text, "fit")
		color = self._classify(text, "color")
		price = parse_price_advanced(text)
		scores = {}
		return NLIAttributes(
			category=cat,
			gender=gender,
			sleeve=sleeve,
			season=season,
			fit=fit,
			color=color,
			price=price,
			scores=scores,
		)


