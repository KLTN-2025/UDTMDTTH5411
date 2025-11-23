import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard';
import './ShopProfilePage.css';

interface Shop {
  id: string;
  username: string;
  email: string;
  role: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  };
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  brand: string;
  size?: string;
  color?: string;
  material?: string;
  images?: string[];
  stock: number;
  shop_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  discount_percentage: number;
  rating?: number;
  reviewCount?: number;
  created_at: string;
  updated_at: string;
}

interface ShopProfileResponse {
  shop: Shop;
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

const ShopProfilePage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ShopProfileResponse['pagination'] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchShopProfile = async (page: number = 1) => {
    if (!shopId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/products/shop/${shopId}?page=${page}&limit=20`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Không tìm thấy shop');
        }
        throw new Error('Không thể tải thông tin shop');
      }

      const data: ShopProfileResponse = await response.json();
      setShop(data.shop);
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setShop(null);
      setProducts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopProfile(currentPage);
  }, [shopId, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatProductForCard = (product: Product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.original_price,
    image: product.images && product.images.length > 0 ? product.images[0] : '🛍️',
    shop_id: product.shop_id,
    size: product.size || 'M',
    color: product.color || 'Đen',
    category: product.category,
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0
  });

  const renderPagination = () => {
    if (!pagination || pagination.total_pages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.total_pages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-btn ${i === pagination.page ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={!pagination.has_prev}
          className="pagination-btn"
        >
          « Trước
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={!pagination.has_next}
          className="pagination-btn"
        >
          Sau »
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="shop-profile-page">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Đang tải thông tin shop...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shop-profile-page">
        <div className="container">
          <div className="error">
            <div className="error-icon">❌</div>
            <h3>Không thể tải thông tin shop</h3>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="back-button">
              ← Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="shop-profile-page">
        <div className="container">
          <div className="error">
            <div className="error-icon">🏪</div>
            <h3>Shop không tồn tại</h3>
            <p>Shop này có thể đã bị xóa hoặc không còn hoạt động</p>
            <button onClick={() => navigate('/')} className="back-button">
              ← Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-profile-page">
      <div className="container">
        {/* Shop Header */}
        <div className="shop-header">
          <div className="shop-avatar-large">
            {shop.profile?.avatar ? (
              <img src={shop.profile.avatar} alt="Shop avatar" className="shop-avatar-img" />
            ) : (
              <span className="shop-icon">🏪</span>
            )}
          </div>
          <div className="shop-info">
            <h1 className="shop-name">{shop.username}</h1>
            <p className="shop-email">{shop.email}</p>
            {shop.profile && (
              <div className="shop-profile-info">
                {shop.profile.firstName && shop.profile.lastName && (
                  <p className="shop-fullname">
                    {shop.profile.firstName} {shop.profile.lastName}
                  </p>
                )}
                {shop.profile.phone && (
                  <p className="shop-phone">📞 {shop.profile.phone}</p>
                )}
              </div>
            )}
            <div className="shop-stats">
              <div className="stat-item">
                <span className="stat-number">{pagination?.total || 0}</span>
                <span className="stat-label">Sản phẩm</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">⭐ 4.8</span>
                <span className="stat-label">Đánh giá</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="products-section">
          <div className="section-header">
            <h2 className="section-title">🛍️ Sản phẩm của shop</h2>
            {pagination && (
              <p className="products-count">
                Hiển thị {products.length} trong tổng số {pagination.total} sản phẩm
              </p>
            )}
          </div>

          {products.length > 0 ? (
            <>
              <div className="products-grid">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={formatProductForCard(product)}
                  />
                ))}
              </div>
              {renderPagination()}
            </>
          ) : (
            <div className="no-products">
              <div className="no-products-icon">📦</div>
              <h3>Shop chưa có sản phẩm nào</h3>
              <p>Shop này chưa đăng bán sản phẩm nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopProfilePage;
