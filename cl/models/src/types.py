from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Dict, Any


class IntentLabel(str, Enum):
	SEARCH = "search"
	FILTER_PRICE_LOW = "filter_price_low"
	FILTER_PRICE_HIGH = "filter_price_high"
	SORT_PRICE_ASC = "sort_price_asc"
	SORT_PRICE_DESC = "sort_price_desc"
	GENERATE_QUERY = "generate_query"


@dataclass
class Product:
	id: str
	name: str
	description: str
	price: float


@dataclass
class StructuredQuery:
	text: str  # truy vấn văn bản tự nhiên
	name_keywords: List[str]
	must_terms: List[str]
	price_min: Optional[float]
	price_max: Optional[float]
	sort_by: Optional[str]  # one of: price_asc, price_desc, relevance


@dataclass
class SearchResult:
	product: Product
	score: float


@dataclass
class IntentResult:
	label: IntentLabel
	confidence: float
	details: Dict[str, Any]
