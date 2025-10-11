from __future__ import annotations

from typing import Any, Dict
import os
import sys

from fastapi import FastAPI
from pydantic import BaseModel

_ROOT = os.path.dirname(__file__)
_MODELS_DIR = os.path.join(_ROOT, "models")
if _MODELS_DIR not in sys.path:
	sys.path.append(_MODELS_DIR)

from models.src.models.apparel_mapper import apparel_text_to_feature_dict, apparel_text_to_structured_query
from models.src.data.mongo import MongoConnection, build_text_price_query
from agents.product_agent import ProductAgent
from models.src.models.vi_nli_extractor import ZeroShotVIExtractor


app = FastAPI(title="Product Search API", version="0.1.0")

_mongo = MongoConnection()
_agent = ProductAgent(_mongo)
_nli_extractor: ZeroShotVIExtractor | None = None


class AnalyzeRequest(BaseModel):
	text: str
	use_nli: bool = False


@app.post("/analyze_apparel")
def analyze_apparel(req: AnalyzeRequest) -> Dict[str, Any]:
	"""Phân tích đặc trưng truy vấn thời trang, trả về đặc trưng + StructuredQuery."""
	global _nli_extractor
	if req.use_nli and _nli_extractor is None:
		_nli_extractor = ZeroShotVIExtractor()
	features = apparel_text_to_feature_dict(req.text)
	sq = apparel_text_to_structured_query(req.text, use_nli=req.use_nli, nli=_nli_extractor)
	return {
		"features": features,
		"structured_query": {
			"text": sq.text,
			"name_keywords": sq.name_keywords,
			"must_terms": sq.must_terms,
			"price_min": sq.price_min,
			"price_max": sq.price_max,
			"sort_by": sq.sort_by,
		},
	}


@app.get("/")
def root() -> Dict[str, Any]:
	return {"message": "OK"}


class SearchRequest(BaseModel):
    text: str
    top_k: int = 20
    use_nli: bool = False


@app.post("/search_apparel")
def search_apparel(req: SearchRequest) -> Dict[str, Any]:
    """Phân tích đặc trưng truy vấn, sau đó tìm sản phẩm trong MongoDB.
    DB: fashion-video-app-prd, collection: products
    """
    global _nli_extractor
    if req.use_nli and _nli_extractor is None:
        _nli_extractor = ZeroShotVIExtractor()
    features = apparel_text_to_feature_dict(req.text)
    sq = apparel_text_to_structured_query(req.text, use_nli=req.use_nli, nli=_nli_extractor)
    query = build_text_price_query(sq.name_keywords, sq.price_min, sq.price_max)
    coll = _mongo.get_collection("fashion-video-app-prd", "products")
    cursor = coll.find(query).limit(int(req.top_k))
    items = []
    for doc in cursor:
        items.append({
            "id": str(doc.get("_id")),
            "name": doc.get("name"),
            "price": doc.get("sale_price"),
            "images": doc.get("images", [])[:3],
            "score": None,
        })
    return {
        "features": features,
        "structured_query": {
            "text": sq.text,
            "name_keywords": sq.name_keywords,
            "must_terms": sq.must_terms,
            "price_min": sq.price_min,
            "price_max": sq.price_max,
            "sort_by": sq.sort_by,
        },
        "mongo_filter": query,
        "results": items,
    }


class ChatRequest(BaseModel):
    text: str | None = None
    image_url: str | None = None
    top_k: int = 20
    use_nli: bool = False


@app.post("/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    if req.image_url:
        r = _agent.embed_image_and_search(req.image_url, fallback_text=req.text or "", top_k=req.top_k)
    else:
        r = _agent.search_by_text(req.text or "", top_k=req.top_k)
    return {
        "message": r.message,
        "features": r.features,
        "structured_query": r.structured_query,
        "results": r.results,
        "extra": r.extra,
    }


