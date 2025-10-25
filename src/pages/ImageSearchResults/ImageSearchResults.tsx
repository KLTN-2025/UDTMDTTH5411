import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import './ImageSearchResults.css';

interface SearchResult {
  _id: string;
  id?: string; // Add id field for compatibility
  name: string;
  description?: string;
  price: number;
  sale_price?: number;
  images: string[];
  shop_id: string;
  shop_name?: string;
  category_id: string;
  category_name?: string;
  similarity_score: number;
  distance: number;
}

interface LocationState {
  results: SearchResult[];
  queryImage: string;
  queryFileName: string;
}

const ImageSearchResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [queryImage, setQueryImage] = useState<string>('');
  const [queryFileName, setQueryFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const state = location.state as LocationState;
    
    if (!state || !state.results) {
      setError('Không có kết quả tìm kiếm');
      setIsLoading(false);
      return;
    }

    setResults(state.results);
    setQueryImage(state.queryImage);
    setQueryFileName(state.queryFileName);
    setIsLoading(false);
  }, [location.state]);

  const handleAddToCart = async (product: SearchResult) => {
    try {
      await addToCart(product._id, 1);
      // Có thể thêm notification thành công ở đây
    } catch (error) {
      console.error('Lỗi thêm vào giỏ hàng:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return '#10b981'; // Green
    if (score >= 0.8) return '#f59e0b'; // Yellow
    if (score >= 0.7) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getSimilarityText = (score: number) => {
    if (score >= 0.9) return 'Rất giống';
    if (score >= 0.8) return 'Khá giống';
    if (score >= 0.7) return 'Tương tự';
    return 'Ít giống';
  };

  if (isLoading) {
    return (
      <div className="image-search-results">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Đang tải kết quả tìm kiếm...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="image-search-results">
        <div className="container">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Không tìm thấy kết quả</h2>
            <p>{error}</p>
            <button 
              className="back-button"
              onClick={() => navigate('/')}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-search-results">
      <div className="container">
        {/* Header */}
        <div className="results-header">
          <button 
            className="back-button"
            onClick={() => navigate('/')}
          >
            ← Quay lại
          </button>
          
          <div className="query-info">
            <h1>Kết quả tìm kiếm hình ảnh</h1>
            <div className="query-image-container">
              <img src={queryImage} alt="Query" className="query-image" />
              <div className="query-details">
                <p className="query-filename">{queryFileName}</p>
                <p className="results-count">
                  Tìm thấy {results.length} sản phẩm tương tự
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        {results.length > 0 ? (
          <div className="results-grid">
            {results.map((product, index) => (
              <div key={product._id} className="product-card">
                <div className="product-image-container">
                  <Link to={`/product/${product._id}`}>
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="product-image"
                    />
                  </Link>
                  
                  {/* Similarity Badge */}
                  <div 
                    className="similarity-badge"
                    style={{ backgroundColor: getSimilarityColor(product.similarity_score) }}
                  >
                    <span className="similarity-score">
                      {Math.round(product.similarity_score * 100)}%
                    </span>
                    <span className="similarity-text">
                      {getSimilarityText(product.similarity_score)}
                    </span>
                  </div>
                </div>

                <div className="product-info">
                  <Link to={`/product/${product._id}`} className="product-name">
                    {product.name}
                  </Link>
                  
                  {product.description && (
                    <p className="product-description">
                      {product.description.length > 100 
                        ? `${product.description.substring(0, 100)}...` 
                        : product.description
                      }
                    </p>
                  )}

                  <div className="product-price">
                    {product.sale_price && product.sale_price < product.price ? (
                      <>
                        <span className="sale-price">
                          {formatPrice(product.sale_price)}
                        </span>
                        <span className="original-price">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="price">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>

                  {product.shop_name && (
                    <p className="shop-name">
                      🏪 {product.shop_name}
                    </p>
                  )}

                  <div className="product-actions">
                    <button 
                      className="add-to-cart-button"
                      onClick={() => handleAddToCart(product)}
                    >
                      🛒 Thêm vào giỏ
                    </button>
                    <Link 
                      to={`/product/${product.id || product._id}`}
                      className="view-details-button"
                      onClick={() => {
                        console.log('Navigating to product:', product.id || product._id);
                        console.log('Product data:', product);
                        console.log('Using ID:', product.id || product._id);
                      }}
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h2>Không tìm thấy sản phẩm tương tự</h2>
            <p>Thử tìm kiếm với hình ảnh khác hoặc sử dụng tìm kiếm văn bản</p>
            <button 
              className="search-again-button"
              onClick={() => navigate('/')}
            >
              Tìm kiếm lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSearchResults;
