from __future__ import annotations

from typing import List, Optional, Dict, Any

from src.types import StructuredQuery
from src.models.apparel_extractor import extract_apparel_attributes, ApparelQuery
from src.models.vi_nli_extractor import ZeroShotVIExtractor


def _compose_name_keywords(aq: ApparelQuery) -> List[str]:
	"""Ghép các thuộc tính làm từ khóa tìm theo tên/mô tả."""
	keywords: List[str] = []
	for val in [aq.category, aq.gender, aq.sleeve, aq.season, aq.fit, aq.color]:
		if val:
			keywords.append(val)
	return keywords


def apparel_text_to_structured_query(text: str, use_nli: bool = False, nli: ZeroShotVIExtractor | None = None) -> StructuredQuery:
	"""Chuyển văn bản truy vấn thời trang sang StructuredQuery chuẩn của hệ thống."""
	if use_nli:
		if nli is None:
			nli = ZeroShotVIExtractor()
		att = nli.extract(text)
		from src.models.apparel_extractor import ApparelQuery, PriceQuery  # tránh vòng import
		aq = ApparelQuery(att.category, att.gender, att.sleeve, att.season, att.fit, att.color, att.price)
	else:
		aq = extract_apparel_attributes(text)
	price_min: Optional[float] = None
	price_max: Optional[float] = None
	if aq.price.mode == "range":
		price_min = float(aq.price.lower) if aq.price.lower is not None else None
		price_max = float(aq.price.upper) if aq.price.upper is not None else None
	elif aq.price.mode == "under":
		price_max = float(aq.price.upper) if aq.price.upper is not None else None
	elif aq.price.mode == "over":
		price_min = float(aq.price.lower) if aq.price.lower is not None else None
	elif aq.price.mode == "approx":
		# dùng biên khoảng cho filter mềm
		price_min = float(aq.price.lower) if aq.price.lower is not None else None
		price_max = float(aq.price.upper) if aq.price.upper is not None else None

	name_keywords = _compose_name_keywords(aq)
	return StructuredQuery(
		text=text,
		name_keywords=name_keywords,
		must_terms=name_keywords,  # có thể tinh chỉnh tách riêng nếu cần
		price_min=price_min,
		price_max=price_max,
		sort_by=None,
	)


def apparel_text_to_feature_dict(text: str) -> Dict[str, Any]:
	"""Trả về dict đặc trưng trích xuất để logging/debug hoặc hiển thị UI."""
	aq = extract_apparel_attributes(text)
	return {
		"category": aq.category,
		"gender": aq.gender,
		"sleeve": aq.sleeve,
		"season": aq.season,
		"fit": aq.fit,
		"color": aq.color,
		"price": {
			"mode": aq.price.mode,
			"lower": aq.price.lower,
			"upper": aq.price.upper,
			"approx": aq.price.approx,
		},
	}


