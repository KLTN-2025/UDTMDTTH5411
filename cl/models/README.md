# Intent + Generate + Search Pipeline

Dự án cung cấp pipeline LLM để: (1) nhận diện intent, (2) sinh query có cấu trúc, (3) truy hồi theo embedding dựa trên name/description/price, kèm demo Gradio.

## Cài đặt

```bash
pip install -r requirements.txt
```

## Chạy demo Gradio

```bash
python app_gradio.py
```

## Dữ liệu
- CSV: cột `id,name,description,price`
- JSON: mảng object với key tương tự.

## Cấu trúc
- `src/types.py`: kiểu dữ liệu
- `src/data/loader.py`: load dữ liệu sản phẩm
- `src/models/intent.py`: zero-shot intent detection
- `src/models/embedding.py`: embedding + chỉ mục tìm kiếm
- `src/models/query_generation.py`: sinh query có cấu trúc
- `src/pipelines/search.py`: pipeline hợp nhất
- `app_gradio.py`: ứng dụng demo
