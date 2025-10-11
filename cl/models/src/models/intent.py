from typing import List

from transformers import pipeline

from src.types import IntentResult, IntentLabel


class IntentDetector:
	"""Zero-shot intent detection dựa trên MNLI.
	Mục tiêu nhận diện: search, filter theo giá, sort theo giá, generate_query.
	"""

	def __init__(self, model_name: str = "facebook/bart-large-mnli", device: int = -1):
		self.classifier = pipeline(
			"zero-shot-classification",
			model=model_name,
			device=device,
		)
		self.candidate_labels: List[str] = [
			IntentLabel.SEARCH.value,
			IntentLabel.FILTER_PRICE_LOW.value,
			IntentLabel.FILTER_PRICE_HIGH.value,
			IntentLabel.SORT_PRICE_ASC.value,
			IntentLabel.SORT_PRICE_DESC.value,
			IntentLabel.GENERATE_QUERY.value,
		]

	def predict(self, text: str) -> IntentResult:
		hypothesis_template = "Câu này là về {}."
		out = self.classifier(
			sequences=text,
			candidate_labels=list(self.candidate_labels),
			hypothesis_template=hypothesis_template,
			multi_label=False,
		)
		label = out["labels"][0]
		score = float(out["scores"][0])
		return IntentResult(label=IntentLabel(label), confidence=score, details={"raw": out})
