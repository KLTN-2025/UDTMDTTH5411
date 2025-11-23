import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReviewModal from '../../components/ReviewModal/ReviewModal';
import './CustomerOrdersPage.css';

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

interface ShippingAddress {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
}

interface Order {
  id: string;
  customer_id: string;
  shop_id: string;
  items: OrderItem[];
  shipping_address: ShippingAddress;
  payment_method: string;
  total_amount: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  current_page: number;
  total_pages: number;
  total_orders: number;
  limit: number;
}

const CustomerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    orderId: string;
    productId: string;
    productName: string;
  }>({
    isOpen: false,
    orderId: '',
    productId: '',
    productName: ''
  });

  // Lấy customer_id từ localStorage (giả sử đã đăng nhập)
  const customerId = localStorage.getItem('userId') || '68d661dbb7ff4203f4ba5c69'; // Fallback cho test

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`http://localhost:8000/orders/customer/${customerId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err);
      setError('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
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

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Chờ xử lý',
      'confirmed': 'Đã xác nhận',
      'shipping': 'Đang giao hàng',
      'delivered': 'Đã giao hàng',
      'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status: string) => {
    const statusClassMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'shipping': 'status-shipping',
      'delivered': 'status-delivered',
      'cancelled': 'status-cancelled'
    };
    return statusClassMap[status] || 'status-pending';
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const openReviewModal = (orderId: string, productId: string, productName: string) => {
    setReviewModal({
      isOpen: true,
      orderId,
      productId,
      productName
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      orderId: '',
      productId: '',
      productName: ''
    });
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    try {
      const response = await fetch('http://localhost:8000/reviews/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: reviewModal.orderId,
          product_id: reviewModal.productId,
          customer_id: customerId,
          rating,
          comment
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Có lỗi xảy ra khi gửi đánh giá');
      }

      alert('Đánh giá đã được gửi thành công!');
      closeReviewModal();
    } catch (error) {
      console.error('Lỗi khi gửi đánh giá:', error);
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi đánh giá');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="customer-orders-page">
        <div className="container">
          <div className="loading">Đang tải đơn hàng...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-orders-page">
        <div className="container">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-orders-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Đơn hàng của tôi</h1>
          <p className="page-description">Theo dõi trạng thái đơn hàng và lịch sử mua sắm</p>
        </div>

        <div className="orders-filters">
          <div className="filter-group">
            <label className="filter-label">Trạng thái:</label>
            <select 
              className="filter-select" 
              value={statusFilter} 
              onChange={handleStatusFilter}
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ xử lý</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="shipping">Đang giao hàng</option>
              <option value="delivered">Đã giao hàng</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {orders.length > 0 ? (
          <>
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <h3 className="order-id">Đơn hàng #{order.id.slice(-8)}</h3>
                      <span className="order-date">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="order-status">
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="order-items">
                    {order.items.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-info">
                          <div className="item-details">
                            <span className="item-name">Sản phẩm ID: {item.product_id}</span>
                            {item.size && <span className="item-variant">Size: {item.size}</span>}
                            {item.color && <span className="item-variant">Màu: {item.color}</span>}
                          </div>
                          <div className="item-quantity">Số lượng: {item.quantity}</div>
                        </div>
                        <div className="item-actions">
                          <div className="item-price">{formatPrice(item.price)}</div>
                          {order.status === 'delivered' && (
                            <button
                              className="review-btn"
                              onClick={() => openReviewModal(order.id, item.product_id, `Sản phẩm ${item.product_id.slice(-8)}`)}
                            >
                              ⭐ Đánh giá
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-summary">
                    <div className="shipping-info">
                      <h4>Thông tin giao hàng:</h4>
                      <p><strong>{order.shipping_address.full_name}</strong></p>
                      <p>{order.shipping_address.phone}</p>
                      <p>{order.shipping_address.address}, {order.shipping_address.ward}, {order.shipping_address.district}, {order.shipping_address.city}</p>
                    </div>
                    <div className="payment-info">
                      <p><strong>Phương thức thanh toán:</strong> {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : order.payment_method}</p>
                      <div className="total-amount">
                        <strong>Tổng tiền: {formatPrice(order.total_amount)}</strong>
                      </div>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="order-notes">
                      <strong>Ghi chú:</strong> {order.notes}
                    </div>
                  )}

                  <div className="order-actions">
                    <Link to={`/order/${order.id}`} className="btn btn-outline">
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              ))}
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
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h3>Chưa có đơn hàng nào</h3>
            <p>Bạn chưa có đơn hàng nào. Hãy bắt đầu mua sắm ngay!</p>
            <Link to="/category/all" className="btn btn-primary">
              Mua sắm ngay
            </Link>
          </div>
        )}
      </div>

      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={closeReviewModal}
        onSubmit={handleSubmitReview}
        productName={reviewModal.productName}
        orderId={reviewModal.orderId}
      />
    </div>
  );
};

export default CustomerOrdersPage;
