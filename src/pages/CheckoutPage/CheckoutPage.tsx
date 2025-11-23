import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import './CheckoutPage.css';

interface OrderForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  paymentMethod: 'cod' | 'bank_transfer';
  notes: string;
}

const CheckoutPage: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<OrderForm>({
    fullName: user?.profile?.firstName && user?.profile?.lastName 
      ? `${user.profile.firstName} ${user.profile.lastName}` 
      : user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.profile?.address?.street || '',
    city: user?.profile?.address?.city || '',
    district: '',
    ward: '',
    paymentMethod: 'cod',
    notes: ''
  });
  
  const [errors, setErrors] = useState<Partial<OrderForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Tính toán thời gian giao hàng dự kiến (3-5 ngày liên tiếp)
  const calculateDeliveryDate = () => {
    const today = new Date();
    const deliveryStart = new Date(today);
    const deliveryEnd = new Date(today);
    
    // Thêm 3 ngày liên tiếp
    deliveryStart.setDate(deliveryStart.getDate() + 3);
    
    // Thêm 5 ngày liên tiếp
    deliveryEnd.setDate(deliveryEnd.getDate() + 5);
    
    return {
      start: deliveryStart,
      end: deliveryEnd
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const deliveryDates = calculateDeliveryDate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof OrderForm]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<OrderForm> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Họ tên là bắt buộc';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Địa chỉ là bắt buộc';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Thành phố là bắt buộc';
    }

    if (!formData.district.trim()) {
      newErrors.district = 'Quận/Huyện là bắt buộc';
    }

    if (!formData.ward.trim()) {
      newErrors.ward = 'Phường/Xã là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.role !== 'customer') {
      alert('Chỉ khách hàng mới có thể đặt hàng');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      
      const orderData = {
        customer_id: user.id,
        items: items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          shop_id: item.shop_id  // ← THÊM shop_id
        })),
        shipping_address: {
          full_name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          ward: formData.ward
        },
        payment_method: formData.paymentMethod,
        total_amount: totalPrice,
        notes: formData.notes
      };

      const response = await fetch('http://localhost:8000/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Đặt hàng thất bại');
      }

      const orderResult = await response.json();
      
      // Clear cart after successful order
      clearCart();
      
      alert('Đặt hàng thành công! Mã đơn hàng: ' + orderResult.id);
      navigate('/');
      
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đặt hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || user.role !== 'customer') {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="access-denied">
            <h2>Không có quyền truy cập</h2>
            <p>Chỉ khách hàng mới có thể thanh toán.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="empty-cart">
            <h2>Giỏ hàng trống</h2>
            <p>Bạn cần có sản phẩm trong giỏ hàng để thanh toán.</p>
            <button onClick={() => navigate('/category/all')} className="btn btn-primary">
              Mua sắm ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="checkout-header">
          <h1>Thanh toán</h1>
          <p>Hoàn tất đơn hàng của bạn</p>
        </div>

        <div className="checkout-content">
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-section">
              <h2>Thông tin giao hàng</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Họ và tên *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={errors.fullName ? 'error' : ''}
                    placeholder="Nhập họ và tên"
                  />
                  {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="Nhập email"
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Số điện thoại *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={errors.phone ? 'error' : ''}
                    placeholder="Nhập số điện thoại"
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Địa chỉ *</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={errors.address ? 'error' : ''}
                  placeholder="Số nhà, tên đường"
                />
                {errors.address && <span className="error-message">{errors.address}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">Thành phố *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={errors.city ? 'error' : ''}
                    placeholder="Nhập thành phố"
                  />
                  {errors.city && <span className="error-message">{errors.city}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="district">Quận/Huyện *</label>
                  <input
                    type="text"
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className={errors.district ? 'error' : ''}
                    placeholder="Nhập quận/huyện"
                  />
                  {errors.district && <span className="error-message">{errors.district}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ward">Phường/Xã *</label>
                <input
                  type="text"
                  id="ward"
                  name="ward"
                  value={formData.ward}
                  onChange={handleInputChange}
                  className={errors.ward ? 'error' : ''}
                  placeholder="Nhập phường/xã"
                />
                {errors.ward && <span className="error-message">{errors.ward}</span>}
              </div>
            </div>

            <div className="form-section">
              <h2>Thông tin giao hàng</h2>
              
              <div className="delivery-info">
                <div className="delivery-card">
                  <div className="delivery-icon">🚚</div>
                  <div className="delivery-details">
                    <h3>Thời gian giao hàng dự kiến</h3>
                    <p className="delivery-date">
                      Từ <strong>{formatDate(deliveryDates.start)}</strong> đến <strong>{formatDate(deliveryDates.end)}</strong>
                    </p>
                    <p className="delivery-note">
                      Hàng sẽ được giao trong 3-5 ngày (giao hàng cả tuần)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Phương thức thanh toán</h2>
              
              <div className="payment-methods">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleInputChange}
                  />
                  <div className="payment-info">
                    <span className="payment-name">Thanh toán khi nhận hàng (COD)</span>
                    <span className="payment-desc">Thanh toán bằng tiền mặt khi nhận hàng</span>
                  </div>
                </label>
                
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={formData.paymentMethod === 'bank_transfer'}
                    onChange={handleInputChange}
                  />
                  <div className="payment-info">
                    <span className="payment-name">Chuyển khoản ngân hàng</span>
                    <span className="payment-desc">Chuyển khoản trước khi giao hàng</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-section">
              <h2>Ghi chú đơn hàng</h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Ghi chú thêm cho đơn hàng (tùy chọn)"
                rows={4}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/cart')}
              >
                Quay lại giỏ hàng
              </button>
              
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : `Đặt hàng - ${formatPrice(totalPrice)}`}
              </button>
            </div>
          </form>

          <div className="order-summary">
            <div className="summary-card">
              <h3>Tóm tắt đơn hàng</h3>
              
              <div className="order-items">
                {items.map((item) => (
                  <div key={item.id} className="order-item">
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-details">
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && ' • '}
                        {item.color && `Màu: ${item.color}`}
                      </span>
                    </div>
                    <div className="item-quantity">x{item.quantity}</div>
                    <div className="item-price">{formatPrice(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
              
              <div className="summary-total">
                <div className="total-row">
                  <span>Tạm tính:</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="total-row">
                  <span>Phí vận chuyển:</span>
                  <span className="free">Miễn phí</span>
                </div>
                <div className="total-row final">
                  <span>Tổng cộng:</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;


