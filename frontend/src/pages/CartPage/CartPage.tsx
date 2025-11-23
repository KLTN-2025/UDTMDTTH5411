import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import './CartPage.css';

const CartPage: React.FC = () => {
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role !== 'customer') {
      alert('Chỉ khách hàng mới có thể thanh toán');
      return;
    }
    
    navigate('/checkout');
  };

  const handleContinueShopping = () => {
    navigate('/category/all');
  };

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="cart-header">
            <h1>Giỏ hàng của bạn</h1>
          </div>
          
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Giỏ hàng trống</h2>
            <p>Bạn chưa có sản phẩm nào trong giỏ hàng</p>
            <button 
              className="btn btn-primary"
              onClick={handleContinueShopping}
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1>Giỏ hàng của bạn</h1>
          <p className="cart-summary">
            {totalItems} sản phẩm • Tổng tiền: {formatPrice(totalPrice)}
          </p>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  {item.image && item.image.startsWith('http') ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="cart-item-image"
                    />
                  ) : (
                    <div className="image-placeholder">
                      {item.image || '🛍️'}
                    </div>
                  )}
                </div>

                <div className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  <p className="item-shop">Cửa hàng: {item.shop_name}</p>
                  
                  {item.size && (
                    <p className="item-option">Kích thước: {item.size}</p>
                  )}
                  
                  {item.color && (
                    <p className="item-option">Màu sắc: {item.color}</p>
                  )}

                  <div className="item-price">
                    <span className="current-price">{formatPrice(item.price)}</span>
                    {item.original_price && item.original_price > item.price && (
                      <span className="original-price">{formatPrice(item.original_price)}</span>
                    )}
                  </div>
                </div>

                <div className="item-quantity">
                  <label>Số lượng:</label>
                  <div className="quantity-controls">
                    <button
                      className="quantity-btn"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="quantity-value">{item.quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="item-total">
                  <span className="total-price">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>

                <div className="item-actions">
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                    title="Xóa sản phẩm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h3>Tóm tắt đơn hàng</h3>
              
              <div className="summary-row">
                <span>Tạm tính:</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              
              <div className="summary-row">
                <span>Phí vận chuyển:</span>
                <span className="free-shipping">Miễn phí</span>
              </div>
              
              <div className="summary-row total">
                <span>Tổng cộng:</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>

              <div className="summary-actions">
                <button
                  className="btn btn-secondary"
                  onClick={clearCart}
                >
                  Xóa tất cả
                </button>
                
                <button
                  className="btn btn-primary"
                  onClick={handleCheckout}
                >
                  Thanh toán
                </button>
              </div>

              <div className="continue-shopping">
                <Link to="/category/all" className="continue-link">
                  ← Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;


