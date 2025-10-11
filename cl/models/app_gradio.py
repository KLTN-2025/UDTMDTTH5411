import gradio as gr
import pandas as pd
import torch

from src.data.loader import load_products
from src.models.embedding import EmbeddingIndex
from src.models.intent import IntentDetector
from src.models.query_generation import QueryGenerator
from src.pipelines.search import ProductSearchPipeline


def build_pipeline(data_file: str, device: str = None) -> ProductSearchPipeline:
	device = device or ("cuda" if torch.cuda.is_available() else "cpu")
	products = load_products(data_file)
	index = EmbeddingIndex(device=device)
	index.build(products)
	intent = IntentDetector(device=0 if device == "cuda" else -1)
	generator = QueryGenerator(device=device)
	return ProductSearchPipeline(index=index, intent=intent, generator=generator)


pipeline_state = {"pipe": None}


def on_build(data_file):
	try:
		pipeline_state["pipe"] = build_pipeline(data_file)
		return gr.update(value="Pipeline đã sẵn sàng."), gr.update(visible=True)
	except Exception as e:
		return gr.update(value=f"Lỗi: {e}"), gr.update(visible=False)


def on_search(query: str):
	if pipeline_state["pipe"] is None:
		return {"intent": "", "intent_confidence": 0.0, "structured_query": None, "results": []}
	res = pipeline_state["pipe"].search(query)
	return res


with gr.Blocks(title="LLM Product Search") as demo:
	gr.Markdown("## Tìm kiếm sản phẩm bằng LLM (intent + generate + embedding)")
	with gr.Row():
		data_file = gr.File(label="Tải dữ liệu (.csv/.json)")
		status = gr.Textbox(label="Trạng thái", interactive=False)
	build_btn = gr.Button("Build Pipeline")
	out_json = gr.JSON(label="Kết quả")
	query = gr.Textbox(label="Câu hỏi tìm kiếm", placeholder="ví dụ: điện thoại dưới 10 triệu, ưu tiên giá rẻ")
	search_btn = gr.Button("Tìm kiếm")

	build_btn.click(fn=on_build, inputs=[data_file], outputs=[status, search_btn])
	search_btn.click(fn=on_search, inputs=[query], outputs=[out_json])


if __name__ == "__main__":
	demo.launch()
