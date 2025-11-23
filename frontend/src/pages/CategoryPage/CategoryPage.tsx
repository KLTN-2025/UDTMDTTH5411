import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard';
import './CategoryPage.css';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images?: string[];
  rating?: number;
  review_count?: number;
  category: string;
  is_new?: boolean;
  is_featured?: boolean;
  discount_percentage?: number;
  shop_id: string;
  is_active: boolean;
  size?: string;
  color?: string;
}

const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Map category names to category values
  const getCategoryValue = (name: string) => {
    const nameToValue: {[key: string]: string} = {
      'T-Shirt': 'tshirts',
      'T-Shirts': 'tshirts',
      'Shirt': 'shirts',
      'Shirts': 'shirts',
      'Mỹ phẩm': 'cosmetics',
      'Outerwear': 'outerwear',
      'Shorts': 'shorts',
      'Jeans': 'jeans',
      'Pants': 'pants',
      'Accessories': 'accessories',
      'Jewelry': 'jewelry',
      'Bags': 'bags',
      'Coats': 'coats',
      'Jackets': 'jackets'
    };
    return nameToValue[name] || name.toLowerCase();
  };

  const getCategoryName = (id: string) => {
    const categories: {[key: string]: string} = {
      'all': 'Tất cả sản phẩm',
      'tshirts': 'T-Shirts',
      'shirts': 'Shirts',
      'outerwear': 'Outerwear',
      'shorts': 'Shorts',
      'jeans': 'Jeans',
      'pants': 'Pants',
      'accessories': 'Accessories',
      'jewelry': 'Jewelry',
      'bags': 'Bags',
      'coats': 'Coats',
      'jackets': 'Jackets',
      'cosmetics': 'Mỹ phẩm'
    };
    return categories[id] || 'Danh mục';
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '12'
        });
        
        if (categoryId && categoryId !== 'all') {
          // Convert category name to category value
          const categoryValue = getCategoryValue(categoryId);
          console.log('Category mapping:', { name: categoryId, value: categoryValue });
          params.append('category', categoryValue);
        }
        
        if (sortBy !== 'popular') {
          params.append('sort', sortBy);
        }
        
        if (priceRange !== 'all') {
          const [min, max] = priceRange.split('-');
          if (min) params.append('min_price', min);
          if (max) params.append('max_price', max);
        }
        
        const apiUrl = `http://localhost:8000/products/?${params}`;
        console.log('Fetching products from:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Products API response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Không thể tải sản phẩm');
        }
        
        const data = await response.json();
        console.log('Products data received:', data);
        console.log('Products count:', data.products?.length || 0);
        
        setProducts(data.products || []);
        setTotalPages(Math.ceil(data.total / 12));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải sản phẩm');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId, sortBy, priceRange, currentPage]);

  const formatProductForCard = (product: Product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.original_price,
    image: product.images && product.images.length > 0 ? product.images[0] : '🛍️', // Lấy ảnh đầu tiên hoặc icon mặc định
    rating: product.rating || 4.5,
    reviewCount: product.review_count || 0,
    category: product.category,
    isNew: product.is_new,
    isHot: product.is_featured,
    discount: product.discount_percentage,
    shop_id: product.shop_id,
    size: product.size,
    color: product.color
  });

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriceRange(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="category-page">
        <div className="container">
          <div className="category-header">
            <h1 className="category-title">
              {getCategoryName(categoryId || '')}
            </h1>
            <p className="category-description">
              Khám phá các sản phẩm {getCategoryName(categoryId || ' ').toLowerCase()}{' '} chất lượng cao với giá cả hợp lý
            </p>
          </div>
          <div className="loading">Đang tải sản phẩm...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-page">
        <div className="container">
          <div className="category-header">
            <h1 className="category-title">
              {getCategoryName(categoryId || '')}
            </h1>
            <p className="category-description">
              Khám phá các sản phẩm {getCategoryName(categoryId || '').toLowerCase()} 
              chất lượng cao với giá cả hợp lý
            </p>
          </div>
          <div className="error">Không thể tải sản phẩm: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="container">
        <div className="category-header">
          <h1 className="category-title">
            {getCategoryName(categoryId || '')}
          </h1>
          <p className="category-description">
            Khám phá các sản phẩm {getCategoryName(categoryId || '').toLowerCase()} 
            chất lượng cao với giá cả hợp lý
          </p>
        </div>

        <div className="category-filters">
          <div className="filter-group">
            <label className="filter-label">Sắp xếp theo:</label>
            <select className="filter-select" value={sortBy} onChange={handleSortChange}>
              <option value="popular">Phổ biến</option>
              <option value="price-low">Giá thấp đến cao</option>
              <option value="price-high">Giá cao đến thấp</option>
              <option value="rating">Đánh giá cao</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Giá:</label>
            <select className="filter-select" value={priceRange} onChange={handlePriceChange}>
              <option value="all">Tất cả</option>
              <option value="0-500000">Dưới 500k</option>
              <option value="500000-1000000">500k - 1 triệu</option>
              <option value="1000000-2000000">1-2 triệu</option>
              <option value="2000000-">Trên 2 triệu</option>
            </select>
          </div>
        </div>

        {products.length > 0 ? (
          <>
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={formatProductForCard(product)} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn" 
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  ← Trước
                </button>
                <span className="pagination-info">
                  Trang {currentPage} / {totalPages}
                </span>
                <button 
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-products">
            <p>Không tìm thấy sản phẩm nào trong danh mục này</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;

