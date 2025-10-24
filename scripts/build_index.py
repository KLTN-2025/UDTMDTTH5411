import argparse
import logging
import sys
from pathlib import Path

# Thêm path để import modules
sys.path.append(str(Path(__file__).parent.parent))

from app.services.search_engine import FashionSearchEngine
from app.utils.config import get_settings


def main():
    parser = argparse.ArgumentParser(description="Build FAISS index với FashionCLIP cho database ecommerce")
    parser.add_argument("--force", action="store_true", help="Force rebuild ngay cả khi index đã tồn tại")
    parser.add_argument("--index", type=str, default=None, help="Đường dẫn tùy chỉnh cho index file")
    parser.add_argument("--batch", type=int, default=None, help="Batch size cho processing")
    parser.add_argument("--test", action="store_true", help="Chạy test search sau khi build xong")
    args = parser.parse_args()

    # Setup logging với format đẹp hơn
    logging.basicConfig(
        level=logging.INFO, 
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
    logger = logging.getLogger(__name__)

    logger.info("BAT DAU BUILD INDEX CHO DATABASE ECOMMERCE")
    logger.info("=" * 50)

    settings = get_settings()
    logger.info(f"CAU HINH:")
    logger.info(f"   - Database: {settings.db_name}")
    logger.info(f"   - Collection: {settings.collection_name}")
    logger.info(f"   - Image field: {settings.image_field}")
    logger.info(f"   - Index path: {args.index or settings.index_path}")
    logger.info(f"   - Du kien: ~18 san pham, ~15 co images")

    try:
        # Khởi tạo search engine
        logger.info("\nKHOI TAO FASHIONCLIP SEARCH ENGINE...")
        engine = FashionSearchEngine()

        # Build index
        logger.info("\nBAT DAU BUILD INDEX...")
        index_path = args.index or settings.index_path
        engine.build_index(index_path=index_path, batch_size=args.batch, force_rebuild=args.force)

        # Lấy thống kê
        stats = engine.get_index_stats()
        logger.info("\nV BUILD INDEX HOAN THANH!")
        logger.info(f"THONG KE:")
        logger.info(f"   - So vectors: {stats['num_products']}")
        logger.info(f"   - Dimension: {stats['dimension']}")
        logger.info(f"   - Index path: {index_path}")

        # Test search nếu được yêu cầu
        if args.test:
            logger.info("\nTEST SEARCH...")
            sample_products = engine.get_sample_products(2)
            for i, product in enumerate(sample_products):
                if product.get(settings.image_field):
                    try:
                        results = engine.search_similar_products(
                            product[settings.image_field][0], 
                            k=3
                        )
                        logger.info(f"   Sample {i+1}: Tim thay {len(results)} san pham tuong tu")
                    except Exception as e:
                        logger.warning(f"   Sample {i+1}: Loi - {e}")

        logger.info("\nHOAN THANH!")
        
        # In kết quả cuối cùng
        print("\n" + "="*50)
        print("KET QUA BUILD INDEX:")
        print(f"   - Index path: {index_path}")
        print(f"   - So vectors: {stats['num_products']}")
        print(f"   - Dimension: {stats['dimension']}")
        print(f"   - Database: {stats['database']}")
        print(f"   - Collection: {stats['collection']}")
        print("="*50)

    except Exception as e:
        logger.error(f"X LOI: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    main()