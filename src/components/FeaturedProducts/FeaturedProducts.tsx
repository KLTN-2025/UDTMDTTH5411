import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import './FeaturedProducts.css';

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

const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/products/?page=1&limit=8&featured=true');
        
        if (!response.ok) {
          throw new Error('Không thể tải sản phẩm nổi bật');
        }
        
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải sản phẩm');
        console.error('Error fetching featured products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

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

  if (loading) {
    return (
      <section className="featured-products">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Thời trang nổi bật</h2>
            <p className="section-description">
              Bộ sưu tập thời trang được yêu thích nhất với phong cách hiện đại
            </p>
          </div>
          <div className="loading">Đang tải sản phẩm...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="featured-products">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Thời trang nổi bật</h2>
            <p className="section-description">
              Bộ sưu tập thời trang được yêu thích nhất với phong cách hiện đại
            </p>
          </div>
          <div className="error">Không thể tải sản phẩm: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-products">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Thời trang nổi bật</h2>
          <p className="section-description">
            Bộ sưu tập thời trang được yêu thích nhất với phong cách hiện đại
          </p>
        </div>
        
        {products.length > 0 ? (
          <>
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={formatProductForCard(product)} />
              ))}
            </div>
            
            <div className="section-footer">
              <Link to="/category/all" className="btn btn-primary">
                Xem tất cả sản phẩm
              </Link>
            </div>
          </>
        ) : (
          <div className="no-products">
            <p>Chưa có sản phẩm nổi bật nào</p>
            <Link to="/category/all" className="btn btn-primary">
              Xem tất cả sản phẩm
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;

