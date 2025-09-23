import logging
import sys
from typing import Optional

def setup_logging(level: str = "INFO", log_file: Optional[str] = None):
    """
    Thiết lập logging cho ứng dụng
    
    Args:
        level: Mức độ logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Đường dẫn file log (tùy chọn)
    """
    # Định dạng log
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Cấu hình root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Xóa các handler cũ
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Handler cho console
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Handler cho file (nếu được chỉ định)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Thiết lập level cho các logger cụ thể
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    logging.info(f"Logging đã được thiết lập với level: {level}")