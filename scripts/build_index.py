import argparse
import logging
from app.services.search_engine import FashionSearchEngine
from app.utils.config import get_settings


def main():
    parser = argparse.ArgumentParser(description="Build FAISS index with FashionCLIP features")
    parser.add_argument("--force", action="store_true", help="Force rebuild even if index exists")
    parser.add_argument("--index", type=str, default=None, help="Override index path")
    parser.add_argument("--batch", type=int, default=None, help="Override batch size")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    settings = get_settings()
    engine = FashionSearchEngine()

    index_path = args.index or settings.index_path
    engine.build_index(index_path=index_path, batch_size=args.batch, force_rebuild=args.force)

    stats = engine.get_index_stats()
    print({
        "message": "Index build complete",
        "index_path": index_path,
        "stats": stats,
    })


if __name__ == "__main__":
    main()