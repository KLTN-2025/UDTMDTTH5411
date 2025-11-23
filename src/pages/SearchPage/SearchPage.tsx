import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard';
import './SearchPage.css';

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

interface Shop {
  id: string;
  username: string;
  email: string;
  role: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  created_at?: string;
}

interface SearchResponse {
  products: Product[];
  shops: Shop[];
  total_products: number;
  total_shops: number;
  total: number;
  page: number;
  limit: number;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  
  // Search parameters
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([{ value: 'all', label: 'Tất cả danh mục' }]);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [currentPage, setCurrentPage] = useState(1);

  // Tải danh mục động từ backend, chỉ giữ "Tất cả" mặc định
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:8000/categories');
        if (!res.ok) return;
        const data = await res.json();
        const dynamic = (data || [])
          .filter((c: any) => c?.is_active !== false)
          .map((c: any) => ({ value: c.name, label: c.name }));
        setCategories([{ value: 'all', label: 'Tất cả danh mục' }, ...dynamic]);
      } catch (_) {
        // Nếu lỗi, giữ nguyên chỉ mục "Tất cả"
      }
    };
    fetchCategories();
  }, []);

  const sortOptions = [
    { value: 'relevance', label: 'Liên quan nhất' },
    { value: 'price_asc', label: 'Giá thấp đến cao' },
    { value: 'price_desc', label: 'Giá cao đến thấp' },
    { value: 'newest', label: 'Mới nhất' }
  ];

  const fetchSearchResults = useCallback(async () => {
    if (!query.trim()) {
      setProducts([]);
      setShops([]);
      setSearchData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        page: currentPage.toString(),
        limit: '20'
      });

      const response = await fetch(`http://localhost:8000/products/search-all?${params}`);
      
      if (!response.ok) {
        throw new Error('Không thể tìm kiếm');
      }

      const data: SearchResponse = await response.json();
      setProducts(data.products);
      setShops(data.shops);
      setSearchData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setProducts([]);
      setShops([]);
      setSearchData(null);
    } finally {
      setLoading(false);
    }
  }, [query, currentPage]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Listen for search params changes from header search
  useEffect(() => {
    const newQuery = searchParams.get('q') || '';
    if (newQuery !== query) {
      setQuery(newQuery);
      setCurrentPage(1);
    }
  }, [searchParams, query]);

  const handleFilterChange = () => {
    setCurrentPage(1);
    updateURL();
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category && category !== 'all') params.set('category', category);
    if (sortBy && sortBy !== 'relevance') params.set('sort', sortBy);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    
    setSearchParams(params);
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


  return (
    <div className="search-page">
      <div className="container">
        {/* Search Header */}
        <div className="search-header">
          <h1 className="search-title">
            {query ? `Kết quả tìm kiếm cho "${query}"` : 'Tìm kiếm sản phẩm và shop'}
          </h1>
          {searchData && (
            <p className="search-results-count">
              Tìm thấy {searchData.total_products} sản phẩm và {searchData.total_shops} shop
            </p>
          )}
        </div>

        {/* Search Form - Hidden, only use header search */}
        {/* <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..."
              className="search-input"
            />
            <button type="submit" className="search-button">
              🔍 Tìm kiếm
            </button>
          </div>
        </form> */}

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label className="filter-label">Danh mục:</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                handleFilterChange();
              }}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sắp xếp:</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                handleFilterChange();
              }}
              className="filter-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Giá từ:</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="price-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">đến:</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Không giới hạn"
              className="price-input"
            />
          </div>

          <button
            type="button"
            onClick={handleFilterChange}
            className="apply-filters-btn"
          >
            Áp dụng bộ lọc
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Đang tìm kiếm...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error">
            <p>❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <>
            {(products.length > 0 || shops.length > 0) ? (
              <>
                {/* Shops Section */}
                {shops.length > 0 && (
                  <div className="shops-section">
                    <h2 className="section-title">🏪 Shop ({shops.length})</h2>
                    <div className="shops-grid">
                      {shops.map(shop => (
                        <div key={shop.id} className="shop-card" onClick={() => window.location.href = `/shop/${shop.id}`}>
                          <div className="shop-avatar">
                            {shop.profile?.avatar ? (
                              <img src={shop.profile.avatar} alt="Shop avatar" className="shop-avatar-img" />
                            ) : (
                              <span className="shop-icon">🏪</span>
                            )}
                          </div>
                          <div className="shop-info">
                            <h3 className="shop-name">{shop.username}</h3>
                            <p className="shop-email">{shop.email}</p>
                            {shop.profile && (
                              <p className="shop-profile">
                                {shop.profile.firstName} {shop.profile.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products Section */}
                {products.length > 0 && (
                  <div className="products-section">
                    <h2 className="section-title">🛍️ Sản phẩm ({products.length})</h2>
                    <div className="products-grid">
                      {products.map(product => (
                        <ProductCard
                          key={product.id}
                          product={formatProductForCard(product)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : query ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>Không tìm thấy kết quả nào</h3>
                <p>Thử thay đổi từ khóa tìm kiếm</p>
              </div>
            ) : (
              <div className="search-prompt">
                <div className="search-prompt-icon">🔍</div>
                <h3>Nhập từ khóa để tìm kiếm</h3>
                <p>Tìm kiếm sản phẩm theo tên hoặc shop theo username</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
