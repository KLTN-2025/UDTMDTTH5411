import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import ChatBox from '../../components/ChatBox/ChatBox';
import './ProductPage.css';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images?: string[];
  rating?: number;
  review_count?: number;
  description: string;
  category: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  stock: number;
  shop_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  discount_percentage?: number;
}

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

const ProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [showChat, setShowChat] = useState(false);
  const [shopInfo, setShopInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`http://localhost:8000/products/${productId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Không tìm thấy sản phẩm');
          }
          throw new Error('Không thể tải thông tin sản phẩm');
        }
        
        const productData = await response.json();
        setProduct(productData);
        
        // Set default values
        if (productData.size) setSelectedSize(productData.size);
        if (productData.color) setSelectedColor(productData.color);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải sản phẩm');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const fetchReviews = async () => {
    if (!productId) return;
    
    try {
      setReviewsLoading(true);
      const response = await fetch(`http://localhost:8000/reviews/product/${productId}?page=1&limit=10`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Lỗi khi tải đánh giá:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Load reviews when switching to reviews tab
    if (tab === 'reviews' && reviews.length === 0) {
      fetchReviews();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    if (!user) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'customer') {
      alert('Chỉ khách hàng mới có thể thêm sản phẩm vào giỏ hàng');
      return;
    }
    
    setAddingToCart(true);
    
    try {
      // Format product data for cart
      const productForCart = {
        id: product.id,
        name: product.name,
        price: product.price,
        original_price: product.original_price,
        image: product.images && product.images.length > 0 ? product.images[0] : '🛍️',
        shop_id: product.shop_id,
        shop_name: 'Cửa hàng' // You can fetch shop name from API if needed
      };
      
      addToCart(productForCart, quantity, selectedSize, selectedColor);
      alert('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    if (!user) {
      alert('Vui lòng đăng nhập để mua hàng');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'customer') {
      alert('Chỉ khách hàng mới có thể mua hàng');
      return;
    }
    
    // Add to cart first, then navigate to checkout
    const productForCart = {
      id: product.id,
      name: product.name,
      price: product.price,
      original_price: product.original_price,
      image: product.images && product.images.length > 0 ? product.images[0] : '🛍️',
      shop_id: product.shop_id,
      shop_name: 'Cửa hàng'
    };
    
    addToCart(productForCart, quantity, selectedSize, selectedColor);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="product-page">
        <div className="container">
          <div className="loading">Đang tải thông tin sản phẩm...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-page">
        <div className="container">
          <div className="error">
            <h2>Không tìm thấy sản phẩm</h2>
            <p>{error || 'Sản phẩm không tồn tại'}</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-page">
      <div className="container">
        <div className="product-content">
          <div className="product-images">
            <div className="main-image">
              {product.images && product.images.length > 0 ? (
                <img 
                  src={product.images[selectedImage]} 
                  alt={product.name}
                  className="product-main-image"
                />
              ) : (
                <div className="image-placeholder">
                  🛍️
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <div className="product-breadcrumb">
              <span>Trang chủ</span> / <span>{product.category}</span> / <span>{product.name}</span>
            </div>

            <h1 className="product-title">{product.name}</h1>

            <div className="product-rating">
              <div className="stars">
                {'★'.repeat(Math.floor(product.rating || 4.5))}
                {'☆'.repeat(5 - Math.floor(product.rating || 4.5))}
              </div>
              <span className="rating-text">
                {product.rating || 4.5} ({product.review_count || 0} đánh giá)
              </span>
            </div>

            <div className="product-price">
              <span className="current-price">
                {formatPrice(product.price)}
              </span>
              {product.original_price && (
                <span className="original-price">
                  {formatPrice(product.original_price)}
                </span>
              )}
              {product.discount_percentage && (
                <span className="discount">
                  -{product.discount_percentage}%
                </span>
              )}
            </div>

            <div className="product-description">
              <p>{product.description}</p>
            </div>

            <div className="product-options">
              {product.size && (
                <div className="option-group">
                  <label className="option-label">Kích thước:</label>
                  <div className="size-options">
                    <button
                      className={`size-option selected`}
                    >
                      {product.size}
                    </button>
                  </div>
                </div>
              )}

              {product.color && (
                <div className="option-group">
                  <label className="option-label">Màu sắc:</label>
                  <div className="color-options">
                    <button
                      className="color-option selected"
                      title={product.color}
                    >
                      {product.color}
                    </button>
                  </div>
                </div>
              )}

              {product.brand && (
                <div className="option-group">
                  <label className="option-label">Thương hiệu:</label>
                  <div className="brand-info">
                    <span className="brand-name">{product.brand}</span>
                  </div>
                </div>
              )}

              {product.material && (
                <div className="option-group">
                  <label className="option-label">Chất liệu:</label>
                  <div className="material-info">
                    <span className="material-name">{product.material}</span>
                  </div>
                </div>
              )}

              <div className="option-group">
                <label className="option-label">Số lượng:</label>
                <div className="quantity-controls">
                  <button 
                    className="quantity-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button 
                    className="quantity-btn"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
                <div className="stock-info">
                  <span className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
                  </span>
                </div>
              </div>
            </div>

            <div className="product-actions">
              <button 
                className="btn btn-primary add-to-cart-btn" 
                onClick={handleAddToCart}
                disabled={product.stock === 0 || addingToCart}
              >
                <span>{addingToCart ? '⏳' : '🛒'}</span>
                {addingToCart ? 'Đang thêm...' : (product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng')}
              </button>
              <button 
                className="btn btn-secondary buy-now-btn" 
                onClick={handleBuyNow}
                disabled={product.stock === 0}
              >
                <span>⚡</span>
                {product.stock > 0 ? 'Mua ngay' : 'Hết hàng'}
              </button>
              {user && user.role === 'customer' && shopInfo && (
                <button 
                  className="btn btn-chat"
                  onClick={() => setShowChat(true)}
                >
                  💬 Chat với shop
                </button>
              )}
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span className="meta-label">Tình trạng:</span>
                <span className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Danh mục:</span>
                <span className="category-info">{product.category}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Trạng thái:</span>
                <span className={`status-info ${product.is_active ? 'active' : 'inactive'}`}>
                  {product.is_active ? 'Đang bán' : 'Tạm dừng'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="product-details">
          <div className="details-tabs">
            <button 
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => handleTabChange('description')}
            >
              Mô tả sản phẩm
            </button>
            <button 
              className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
              onClick={() => handleTabChange('specifications')}
            >
              Thông số kỹ thuật
            </button>
            <button 
              className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => handleTabChange('reviews')}
            >
              Đánh giá
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'description' && (
              <div className="product-description-detail">
                <h3>Mô tả chi tiết</h3>
                <p>{product.description}</p>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="product-specifications">
                <h3>Thông tin sản phẩm</h3>
                <div className="specs-table">
                  <div className="spec-row">
                    <span className="spec-label">Tên sản phẩm:</span>
                    <span className="spec-value">{product.name}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Danh mục:</span>
                    <span className="spec-value">{product.category}</span>
                  </div>
                  {product.brand && (
                    <div className="spec-row">
                      <span className="spec-label">Thương hiệu:</span>
                      <span className="spec-value">{product.brand}</span>
                    </div>
                  )}
                  {product.size && (
                    <div className="spec-row">
                      <span className="spec-label">Kích thước:</span>
                      <span className="spec-value">{product.size}</span>
                    </div>
                  )}
                  {product.color && (
                    <div className="spec-row">
                      <span className="spec-label">Màu sắc:</span>
                      <span className="spec-value">{product.color}</span>
                    </div>
                  )}
                  {product.material && (
                    <div className="spec-row">
                      <span className="spec-label">Chất liệu:</span>
                      <span className="spec-value">{product.material}</span>
                    </div>
                  )}
                  <div className="spec-row">
                    <span className="spec-label">Tồn kho:</span>
                    <span className="spec-value">{product.stock} sản phẩm</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Trạng thái:</span>
                    <span className="spec-value">{product.is_active ? 'Đang bán' : 'Tạm dừng'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="reviews-tab-content">
                <div className="reviews-header">
                  <h3>Đánh giá sản phẩm</h3>
                  <span className="reviews-count">({reviews.length} đánh giá)</span>
                </div>

                {reviewsLoading ? (
                  <div className="reviews-loading">Đang tải đánh giá...</div>
                ) : reviews.length > 0 ? (
                  <div className="reviews-list">
                    {reviews.map((review) => (
                      <div key={review.id} className="review-item">
                        <div className="review-header">
                          <div className="review-rating">
                            {renderStars(review.rating)}
                            <span className="review-date">{formatDate(review.created_at)}</span>
                          </div>
                          <div className="review-meta">
                            <span className="customer-id">Khách hàng: {review.customer_id.slice(-8)}</span>
                            <span className="order-id">Đơn hàng: #{review.order_id.slice(-8)}</span>
                          </div>
                        </div>
                        <div className="review-comment">
                          <p>{review.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Chat Modal */}
      {showChat && shopInfo && user && (
        <div className="chat-modal-overlay" onClick={() => setShowChat(false)}>
          <div className="chat-modal-content" onClick={(e) => e.stopPropagation()}>
            <ChatBox
              otherUserId={shopInfo.id}
              otherUserName={shopInfo.name}
              shopId={product.shop_id}
              productId={product.id}
              productName={product.name}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;

