from typing import Optional, List

import re
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from src.types import StructuredQuery


SYSTEM_PROMPT = (
	"Bạn là hệ thống chuyển đổi câu hỏi mua sắm thành JSON truy vấn. "
	"Trả về JSON với keys: text, name_keywords, must_terms, price_min, price_max, sort_by. "
	"sort_by thuộc {price_asc, price_desc, relevance}."
)


class QueryGenerator:
	def __init__(self, model_name: str = "google/flan-t5-base", device: str = "cpu"):
		self.tokenizer = AutoTokenizer.from_pretrained(model_name)
		self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)
		self.device = device

	def _postprocess(self, text: str) -> StructuredQuery:
		# Đơn giản: tìm price_min/max từ mẫu số
		price_min = None
		price_max = None
		numbers = [float(x.replace(",", "")) for x in re.findall(r"\d+[\d,]*\.?\d*", text)]
		if len(numbers) >= 2:
			price_min, price_max = sorted(numbers[:2])
		elif len(numbers) == 1:
			price_min = numbers[0]

		sort_by = None
		if "price_asc" in text:
			sort_by = "price_asc"
		elif "price_desc" in text:
			sort_by = "price_desc"

		# name_keywords/must_terms đơn giản: tách từ trong ngoặc kép
		name_keywords: List[str] = re.findall(r'"([^"]+)"', text)
		must_terms: List[str] = []

		return StructuredQuery(
			text=text,
			name_keywords=name_keywords,
			must_terms=must_terms,
			price_min=price_min,
			price_max=price_max,
			sort_by=sort_by or "relevance",
		)

	def generate(self, user_query: str, max_new_tokens: int = 128) -> StructuredQuery:
		prompt = f"{SYSTEM_PROMPT}\nCâu hỏi: {user_query}\nJSON:"
		inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
		outputs = self.model.generate(
			**inputs,
			max_new_tokens=max_new_tokens,
			num_beams=4,
			temperature=0.2,
		)
		decoded = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
		return self._postprocess(decoded)
