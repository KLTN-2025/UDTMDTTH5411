import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ShopOrdersPage.css';

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  shop_id?: string;
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
  notes: string;
  created_at: string;
  updated_at: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  shop_id: string;
}

const ShopOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (user && user.role === 'shop') {
      fetchOrders();
    }
  }, [user, currentPage, statusFilter]);

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

      const response = await fetch(`http://localhost:8000/orders/shop/${user?.id}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OrdersResponse = await response.json();
      setOrders(data.orders);
      setTotalPages(data.total_pages);
      setTotalOrders(data.total);
    } catch (err) {
      console.error('Lỗi khi lấy đơn hàng:', err);
      setError('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-confirmed';
      case 'shipping':
        return 'status-shipping';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'shipping':
        return 'Đang giao';
      case 'delivered':
        return 'Đã giao';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh orders list
      fetchOrders();
      
      // Show success message
      alert(`Đã cập nhật trạng thái đơn hàng thành "${getStatusText(newStatus)}"`);
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng');
    }
  };

  const handleConfirmOrder = (orderId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xác nhận đơn hàng này?')) {
      updateOrderStatus(orderId, 'confirmed');
    }
  };

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      updateOrderStatus(orderId, 'cancelled');
    }
  };

  const handleShipOrder = (orderId: string) => {
    if (window.confirm('Bạn có chắc chắn đơn hàng đã được giao?')) {
      updateOrderStatus(orderId, 'shipping');
    }
  };

  const handleDeliverOrder = (orderId: string) => {
    if (window.confirm('Bạn có chắc chắn đơn hàng đã được giao thành công?')) {
      updateOrderStatus(orderId, 'delivered');
    }
  };

  if (!user || user.role !== 'shop') {
    return (
      <div className="shop-orders-page">
        <div className="access-denied">
          <h2>🚫 Truy cập bị từ chối</h2>
          <p>Chỉ tài khoản shop mới có thể xem trang này.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shop-orders-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shop-orders-page">
        <div className="error">
          <h2>❌ Lỗi</h2>
          <p>{error}</p>
          <button onClick={fetchOrders} className="retry-button">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-orders-page">
      <div className="container">
        <div className="page-header">
          <h1>📋 Đơn hàng của shop</h1>
          <p>Quản lý các đơn hàng từ khách hàng</p>
        </div>

        <div className="orders-stats">
          <div className="stat-card">
            <div className="stat-number">{totalOrders}</div>
            <div className="stat-label">Tổng đơn hàng</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {orders.filter(order => order.status === 'pending').length}
            </div>
            <div className="stat-label">Chờ xác nhận</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {orders.filter(order => order.status === 'shipping').length}
            </div>
            <div className="stat-label">Đang giao</div>
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="status-filter">Lọc theo trạng thái:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="shipping">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h3>Chưa có đơn hàng nào</h3>
            <p>Khi khách hàng đặt hàng từ shop của bạn, đơn hàng sẽ hiển thị ở đây.</p>
          </div>
        ) : (
          <>
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <h3>Đơn hàng #{order.id.slice(-8)}</h3>
                      <p className="order-date">
                        📅 {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="order-status">
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="order-details">
                    <div className="order-items">
                      <h4>📦 Sản phẩm:</h4>
                      {order.items.map((item, index) => (
                        <div key={index} className="order-item">
                          <div className="item-info">
                            <span className="item-name">Sản phẩm ID: {item.product_id.slice(-8)}</span>
                            <span className="item-details">
                              Số lượng: {item.quantity} | 
                              {item.size && ` Size: ${item.size}`} | 
                              {item.color && ` Màu: ${item.color}`}
                            </span>
                          </div>
                          <div className="item-price">
                            {formatCurrency(item.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-summary">
                      <div className="summary-row">
                        <span>Tổng tiền:</span>
                        <span className="total-amount">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                      <div className="summary-row">
                        <span>Phương thức thanh toán:</span>
                        <span>{order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : order.payment_method}</span>
                      </div>
                    </div>

                    <div className="shipping-info">
                      <h4>🚚 Thông tin giao hàng:</h4>
                      <div className="shipping-details">
                        <p><strong>Người nhận:</strong> {order.shipping_address.full_name}</p>
                        <p><strong>Số điện thoại:</strong> {order.shipping_address.phone}</p>
                        <p><strong>Địa chỉ:</strong> {order.shipping_address.address}, {order.shipping_address.ward}, {order.shipping_address.district}, {order.shipping_address.city}</p>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="order-notes">
                        <h4>📝 Ghi chú:</h4>
                        <p>{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="order-actions">
                    {order.status === 'pending' && (
                      <>
                        <button 
                          className="action-btn confirm-btn"
                          onClick={() => handleConfirmOrder(order.id)}
                        >
                          ✅ Xác nhận đơn hàng
                        </button>
                        <button 
                          className="action-btn cancel-btn"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          ❌ Hủy đơn hàng
                        </button>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <button 
                        className="action-btn ship-btn"
                        onClick={() => handleShipOrder(order.id)}
                      >
                        🚚 Bắt đầu giao hàng
                      </button>
                    )}
                    {order.status === 'shipping' && (
                      <button 
                        className="action-btn deliver-btn"
                        onClick={() => handleDeliverOrder(order.id)}
                      >
                        ✅ Hoàn thành giao hàng
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <div className="completed-status">
                        <span className="completed-text">✅ Đơn hàng đã hoàn thành</span>
                      </div>
                    )}
                    {order.status === 'cancelled' && (
                      <div className="cancelled-status">
                        <span className="cancelled-text">❌ Đơn hàng đã bị hủy</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  ← Trước
                </button>
                
                <span className="pagination-info">
                  Trang {currentPage} / {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShopOrdersPage;
