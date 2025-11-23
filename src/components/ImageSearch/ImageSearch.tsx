import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import './ImageSearch.css';

interface ImageSearchProps {
  className?: string;
}

const ImageSearch: React.FC<ImageSearchProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setError('');
      setSelectedFile(null);
      setPreviewUrl('');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ');
      return;
    }

    // Kiểm tra kích thước file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Tạo preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSearch = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn một hình ảnh');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const results = await apiService.searchSimilarProducts(selectedFile);
      
      // Chuyển đến trang kết quả với dữ liệu
      navigate('/image-search-results', { 
        state: { 
          results, 
          queryImage: previewUrl,
          queryFileName: selectedFile.name 
        } 
      });

      // Reset form
      setIsOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Error searching similar products:', err);
      
      let errorMessage = 'Không thể tìm kiếm sản phẩm tương tự. Vui lòng thử lại.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // Handle object errors
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('detail' in err) {
          errorMessage = String(err.detail);
        } else {
          errorMessage = 'Lỗi không xác định từ server';
        }
      }
      
      console.error('Final error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickOutside = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`image-search ${className}`}>
      <button 
        className="image-search-button"
        onClick={handleButtonClick}
        title="Tìm kiếm sản phẩm tương tự bằng hình ảnh"
      >
        <span className="image-search-icon">📷</span>
        <span className="image-search-text">Tìm bằng ảnh</span>
      </button>

      {isOpen && (
        <div className="image-search-overlay" onClick={handleClickOutside}>
          <div className="image-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="image-search-header">
              <h3>Tìm kiếm sản phẩm tương tự</h3>
              <button 
                className="close-button"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="image-search-content">
              {!selectedFile ? (
                <div className="file-upload-area">
                  <div className="upload-icon">📁</div>
                  <p>Kéo thả hình ảnh vào đây hoặc</p>
                  <button 
                    className="select-file-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Chọn file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <p className="upload-hint">
                    Hỗ trợ: JPG, PNG, GIF (tối đa 10MB)
                  </p>
                </div>
              ) : (
                <div className="image-preview-container">
                  <div className="image-preview">
                    <img src={previewUrl} alt="Preview" />
                    <div className="image-info">
                      <p className="file-name">{selectedFile.name}</p>
                      <p className="file-size">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="preview-actions">
                    <button 
                      className="change-image-button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Đổi ảnh
                    </button>
                    <button 
                      className="clear-button"
                      onClick={handleClear}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message">
                  ⚠️ {typeof error === 'string' ? error : JSON.stringify(error)}
                </div>
              )}

              <div className="search-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setIsOpen(false)}
                >
                  Hủy
                </button>
                <button 
                  className="search-button"
                  onClick={handleSearch}
                  disabled={!selectedFile || isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Đang tìm kiếm...
                    </>
                  ) : (
                    <>
                      🔍 Tìm kiếm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSearch;
