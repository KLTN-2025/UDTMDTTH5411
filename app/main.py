import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.utils.config import get_settings
    _settings = get_settings()
    if _settings.torch_home:
        os.environ.setdefault("TORCH_HOME", _settings.torch_home)
except Exception:
    pass

from fastapi import FastAPI
from app.api.endpoints import router as api_router
from app.utils.config import get_settings
from app.utils.logger import setup_logging
from fastapi.middleware.cors import CORSMiddleware
setup_logging()

app = FastAPI(
    title="Fashion Image Search API",
    description="API for searching similar fashion products using image embeddings",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Fashion Image Search API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)