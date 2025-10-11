from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional, Iterable, Dict


# Các synonym và thuộc tính cơ bản cho sản phẩm thời trang
CATEGORY_SYNONYMS: Dict[str, set[str]] = {
	"áo thun": {"áo thun", "tshirt", "tee"},
	"áo sơ mi": {"áo sơ mi", "sơ mi", "shirt"},
	"áo khoác": {"áo khoác", "khoác", "jacket"},
	"áo len": {"áo len", "len", "sweater"},
	"áo cardigan": {"áo cardigan", "cardigan"},
	"áo hoodie": {"áo hoodie", "hoodie"},
	"áo vest": {"áo vest", "vest", "blazer"},
	"áo croptop": {"áo croptop", "croptop"},
	"áo ba lỗ": {"áo ba lỗ", "ba lỗ", "tank top"},
	"áo polo": {"áo polo", "polo"},
	"quần jean": {"quần jean", "jean", "jeans", "denim"},
	"quần short": {"quần short", "short"},
	"quần tây": {"quần tây", "tây", "trousers", "slacks"},
	"váy": {"váy", "đầm", "dress"},
	"chân váy": {"chân váy", "váy ngắn", "skirt"},
	"giày sneaker": {"giày sneaker", "sneaker"},
	"giày cao gót": {"giày cao gót", "cao gót", "heels"},
	"giày da": {"giày da", "da", "leather shoes"},
	"tinh dầu": {"tinh dầu", "oil","dầu"},
	"nhang": {"nhang", "hương", "nhang nụ", "hương nụ "},
	"nước hoa": {"nước hoa", "perfume", "dầu thơm"},
	"dầu gội" : {"dầu gội", "shampoo", "dầu gội đầu", "dầu gội đầu", "combo gội xả"},
	"kem chống nắng" : {"kem chống nắng", "sunscreen", "sunblock"},
	"kính mát": {"kính mát", "sunglasses", "kính râm"},
	"mũ": {"mũ", "hat", "cap"},
	"giày điện": {"giày điện", "electric shoes", "điện giày"},
	"bàn chải đánh răng": {"bàn chải đánh răng", "toothbrush", "brush"},
	"xịt chống nắng" : {"xịt chống nắng", "sunscreen", "sunblock","sun spray"},
}

GENDER_SYNONYMS: Dict[str, set[str]] = {
	"nam": {"nam", "dành cho nam", "men", "male"},
	"nữ": {"nữ", "dành cho nữ", "women", "female"},
	"unisex": {"unisex", "cả nam nữ"},
}

SLEEVE_SYNONYMS: Dict[str, set[str]] = {
	"ngắn tay": {"ngắn tay"},
	"dài tay": {"dài tay"},
}

SEASON_SYNONYMS: Dict[str, set[str]] = {
	"mùa hè": {"mùa hè", "hè", "mặc mùa hè"},
	"mùa đông": {"mùa đông", "đông", "mặc mùa đông"},
}

FIT_SYNONYMS: Dict[str, set[str]] = {
	"form rộng": {"form rộng", "rộng", "oversize", "oversized"},
	"form ôm": {"form ôm", "ôm", "slim", "fitted"},
}

COLOR_SYNONYMS: Dict[str, set[str]] = {
	"đen": {"đen", "black"},
	"trắng": {"trắng", "white"},
	"xám": {"xám", "grey", "gray"},
	"xanh": {"xanh", "blue", "xanh đậm", "navy"},
	"đỏ": {"đỏ", "red"},

}


def _normalize_text(text: str) -> str:
	"""Chuẩn hóa chuỗi: trim, lower, gom khoảng trắng."""
	return re.sub(r"\s+", " ", text.strip().lower())


_NUM = r"(\d+[\.,]?\d*)"
_DEF_NORM = _normalize_text


@dataclass
class PriceQuery:
	lower: Optional[int]
	upper: Optional[int]
	approx: Optional[int]
	mode: str  # one of: range, under, over, approx, none


VND = 1
K = 1_000
TRIEU = 1_000_000


def _parse_number_unit(text: str) -> Optional[int]:
	"""Chuyển chuỗi số + đơn vị (triệu/tr/nghìn/k) về VND."""
	t = _DEF_NORM(text)
	m = re.search(rf"{_NUM}\s*(triệu|tr|nghìn|k)?", t)
	if not m:
		return None
	val = float(m.group(1).replace(',', '.'))
	unit = m.group(2)
	if unit in {"triệu", "tr"}:
		return int(round(val * TRIEU))
	if unit in {"nghìn", "k"}:
		return int(round(val * K))
	if val >= 1000:
		return int(val)
	return int(round(val * K))


def parse_price_advanced(text: str) -> PriceQuery:
	"""Phân tích các mẫu giá: từ-đến, dưới, trên, khoảng/tầm/xấp xỉ, số trần."""
	t = _DEF_NORM(text)
	# từ-đến
	m = re.search(rf"từ\s+{_NUM}(?:\s*(triệu|tr|nghìn|k))?\s+đến\s+{_NUM}(?:\s*(triệu|tr|nghìn|k))?", t)
	if m:
		n1 = _parse_number_unit(m.group(1) + (" " + (m.group(2) or "") if m.group(2) else ""))
		n2 = _parse_number_unit(m.group(3) + (" " + (m.group(4) or "") if m.group(4) else ""))
		if n1 and n2:
			lo, hi = sorted([n1, n2])
			return PriceQuery(lower=lo, upper=hi, approx=None, mode="range")

	# dưới / dưới hoặc bằng
	m = re.search(rf"(dưới|<=?|ít hơn)\s+{_NUM}(?:\s*(triệu|tr|nghìn|k))?", t)
	if m:
		n = _parse_number_unit(m.group(2) + (" " + (m.group(3) or "") if m.group(3) else ""))
		if n:
			return PriceQuery(lower=None, upper=n, approx=None, mode="under")

	# trên / lớn hơn
	m = re.search(rf"(trên|>=?|lớn hơn)\s+{_NUM}(?:\s*(triệu|tr|nghìn|k))?", t)
	if m:
		n = _parse_number_unit(m.group(2) + (" " + (m.group(3) or "") if m.group(3) else ""))
		if n:
			return PriceQuery(lower=n, upper=None, approx=None, mode="over")

	# khoảng/tầm/xấp xỉ/dao động quanh ~ ±20%
	m = re.search(rf"(khoảng|tầm|xấp xỉ|dao động quanh)\s+{_NUM}(?:\s*(triệu|tr|nghìn|k))?", t)
	if m:
		n = _parse_number_unit(m.group(2) + (" " + (m.group(3) or "") if m.group(3) else ""))
		if n:
			return PriceQuery(lower=int(n * 0.8), upper=int(n * 1.2), approx=n, mode="approx")

	# số trần
	n = _parse_number_unit(t)
	if n:
		return PriceQuery(lower=int(n * 0.9), upper=int(n * 1.1), approx=n, mode="approx")

	return PriceQuery(lower=None, upper=None, approx=None, mode="none")


def _find_key_by_synonyms(text: str, synonyms_map: Dict[str, Iterable[str]]) -> Optional[str]:
	"""Tìm khóa chuẩn theo synonyms, khớp word-boundary để hạn chế nhiễu."""
	t = _DEF_NORM(text)
	for canonical, variants in synonyms_map.items():
		for v in variants:
			if re.search(rf"\b{re.escape(v)}\b", t):
				return canonical
	return None


@dataclass
class ApparelQuery:
	category: Optional[str]
	gender: Optional[str]
	sleeve: Optional[str]
	season: Optional[str]
	fit: Optional[str]
	color: Optional[str]
	price: PriceQuery


def extract_apparel_attributes(text: str) -> ApparelQuery:
	"""Trích xuất các thuộc tính chính từ câu truy vấn sản phẩm thời trang."""
	t = _DEF_NORM(text)
	category = _find_key_by_synonyms(t, CATEGORY_SYNONYMS)
	gender = _find_key_by_synonyms(t, GENDER_SYNONYMS)
	sleeve = _find_key_by_synonyms(t, SLEEVE_SYNONYMS)
	season = _find_key_by_synonyms(t, SEASON_SYNONYMS)
	fit = _find_key_by_synonyms(t, FIT_SYNONYMS)
	color = _find_key_by_synonyms(t, COLOR_SYNONYMS)
	price = parse_price_advanced(t)
	return ApparelQuery(category, gender, sleeve, season, fit, color, price)