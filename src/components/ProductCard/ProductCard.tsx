import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import './ProductCard.css';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  isNew?: boolean;
  isHot?: boolean;
  discount?: number;
  shop_id?: string;
  size?: string;
  color?: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const productForCart = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      shop_id: product.shop_id || '',
      size: product.size || 'M',
      color: product.color || 'Đen'
    };

    addToCart(productForCart, 1);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement wishlist functionality
    console.log('Add to wishlist:', product.id);
  };

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-image">
        {product.image && product.image.startsWith('http') ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="product-image-img"
          />
        ) : (
          <div className="product-emoji">{product.image || '🛍️'}</div>
        )}
        {product.discount && (
          <div className="discount-badge">
            -{product.discount}%
          </div>
        )}
        {product.isNew && (
          <div className="new-badge">Mới</div>
        )}
        {product.isHot && (
          <div className="hot-badge">Hot</div>
        )}
        <button 
          className="wishlist-btn"
          onClick={handleWishlist}
          aria-label="Thêm vào yêu thích"
        >
          ❤️
        </button>
      </div>
      
      <div className="product-info">
        <div className="product-category">{product.category}</div>
        <h3 className="product-name">{product.name}</h3>
        
        <div className="product-rating">
          <div className="stars">
            {'★'.repeat(Math.floor(product.rating))}
            {'☆'.repeat(5 - Math.floor(product.rating))}
          </div>
          <span className="rating-text">
            {product.rating} ({product.reviewCount})
          </span>
        </div>
        
        <div className="product-price">
          <span className="current-price">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="original-price">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        
        <button 
          className="add-to-cart-btn"
          onClick={handleAddToCart}
        >
          <span>🛒</span>
          Thêm vào giỏ
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;

