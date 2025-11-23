import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ReviewsPage.css';

interface Review {
  id: string;
  order_id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  images?: string[];
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_reviews: number;
  limit: number;
}

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<{ [key: string]: Product }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    fetchReviews();
  }, [currentPage, ratingFilter, sortBy]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Tạo params cho API
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (ratingFilter) {
        params.append('rating', ratingFilter);
      }

      // Lấy tất cả reviews (có thể cần tạo endpoint mới)
      const response = await fetch(`http://localhost:8000/reviews/all?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setReviews(data.reviews || []);
      setPagination(data.pagination || null);

      // Lấy thông tin sản phẩm cho các review
      await fetchProductsInfo(data.reviews || []);
    } catch (err) {
      console.error('Lỗi khi tải đánh giá:', err);
      setError('Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsInfo = async (reviews: Review[]) => {
    try {
      const productIds = Array.from(new Set(reviews.map(review => review.product_id)));
      const productsMap: { [key: string]: Product } = {};

      for (const productId of productIds) {
        try {
          const response = await fetch(`http://localhost:8000/products/${productId}`);
          if (response.ok) {
            const product = await response.json();
            productsMap[productId] = product;
          }
        } catch (err) {
          console.error(`Lỗi khi lấy thông tin sản phẩm ${productId}:`, err);
        }
      }

      setProducts(productsMap);
    } catch (err) {
      console.error('Lỗi khi lấy thông tin sản phẩm:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'active' : ''}`}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    const ratingTexts = {
      1: 'Rất không hài lòng',
      2: 'Không hài lòng',
      3: 'Bình thường',
      4: 'Hài lòng',
      5: 'Rất hài lòng'
    };
    return ratingTexts[rating as keyof typeof ratingTexts] || '';
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRatingFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRatingFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="reviews-page">
        <div className="container">
          <div className="loading">Đang tải đánh giá...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reviews-page">
        <div className="container">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Đánh giá sản phẩm</h1>
          <p className="page-description">Xem tất cả đánh giá từ khách hàng</p>
        </div>

        <div className="reviews-filters">
          <div className="filter-group">
            <label className="filter-label">Đánh giá:</label>
            <select 
              className="filter-select" 
              value={ratingFilter} 
              onChange={handleRatingFilter}
            >
              <option value="">Tất cả</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Sắp xếp:</label>
            <select 
              className="filter-select" 
              value={sortBy} 
              onChange={handleSortChange}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="highest">Đánh giá cao nhất</option>
              <option value="lowest">Đánh giá thấp nhất</option>
            </select>
          </div>
        </div>

        {reviews.length > 0 ? (
          <>
            <div className="reviews-list">
              {reviews.map((review) => {
                const product = products[review.product_id];
                return (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="product-info">
                        {product ? (
                          <>
                            <h3 className="product-name">{product.name}</h3>
                            <p className="product-id">ID: {review.product_id.slice(-8)}</p>
                          </>
                        ) : (
                          <h3 className="product-name">Sản phẩm ID: {review.product_id.slice(-8)}</h3>
                        )}
                      </div>
                      <div className="review-meta">
                        <span className="review-date">{formatDate(review.created_at)}</span>
                        <span className="order-id">Đơn hàng: #{review.order_id.slice(-8)}</span>
                      </div>
                    </div>

                    <div className="review-content">
                      <div className="rating-section">
                        <div className="rating-display">
                          {renderStars(review.rating)}
                          <span className="rating-text">{getRatingText(review.rating)}</span>
                        </div>
                      </div>

                      <div className="comment-section">
                        <p className="comment-text">{review.comment}</p>
                      </div>
                    </div>

                    <div className="review-footer">
                      <div className="customer-info">
                        <span className="customer-id">Khách hàng: {review.customer_id.slice(-8)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn" 
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  ← Trước
                </button>
                <span className="pagination-info">
                  Trang {pagination.current_page} / {pagination.total_pages}
                </span>
                <button 
                  className="pagination-btn" 
                  disabled={currentPage === pagination.total_pages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-reviews">
            <div className="no-reviews-icon">⭐</div>
            <h3>Chưa có đánh giá nào</h3>
            <p>Chưa có đánh giá nào được gửi. Hãy là người đầu tiên đánh giá!</p>
            <Link to="/category/all" className="btn btn-primary">
              Mua sắm ngay
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
