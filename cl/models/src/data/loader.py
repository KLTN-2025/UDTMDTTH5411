import json
from typing import List

import pandas as pd

from src.types import Product


def load_products(path: str) -> List[Product]:
	"""Load danh sách sản phẩm từ CSV hoặc JSON.
	Hỗ trợ:
	- CSV: cột id,name,description,price
	- JSON: mảng object có key tương tự
	"""
	if path.lower().endswith(".csv"):
		df = pd.read_csv(path)
		required_cols = {"id", "name", "description", "price"}
		if not required_cols.issubset(set(df.columns)):
			raise ValueError(f"Thiếu cột bắt buộc trong CSV: {required_cols}")
		products = [
			Product(
				id=str(row["id"]),
				name=str(row["name"]),
				description=str(row["description"]),
				price=float(row["price"]),
			)
			for _, row in df.iterrows()
		]
		return products

	if path.lower().endswith(".json"):
		with open(path, "r", encoding="utf-8") as f:
			data = json.load(f)
		products = [
			Product(
				id=str(item["id"]),
				name=str(item["name"]),
				description=str(item.get("description", "")),
				price=float(item.get("price", 0.0)),
			)
			for item in data
		]
		return products

	raise ValueError("Định dạng dữ liệu không hỗ trợ. Chỉ hỗ trợ .csv hoặc .json")
