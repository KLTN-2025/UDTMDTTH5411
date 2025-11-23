import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './AdminOrdersPage.css';

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
  filters: {
    status: string | null;
    shop_id: string | null;
  };
}

const AdminOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [shopIdFilter, setShopIdFilter] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchOrders();
    }
  }, [user, currentPage, statusFilter, shopIdFilter]);

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
      if (shopIdFilter) {
        params.append('shop_id', shopIdFilter);
      }

      const response = await fetch(`http://localhost:8000/orders/admin/all?${params}`);
      
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId);
      
      const response = await fetch(`http://localhost:8000/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Admin cập nhật trạng thái thành: ${getStatusText(newStatus)}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh orders after update
      await fetchOrders();
      alert('Cập nhật trạng thái thành công!');
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái:', err);
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setUpdatingStatus(null);
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

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'shipping';
      case 'shipping':
        return 'delivered';
      default:
        return null;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-orders-page">
        <div className="access-denied">
          <h2>🚫 Truy cập bị từ chối</h2>
          <p>Chỉ tài khoản admin mới có thể xem trang này.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-orders-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-orders-page">
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
    <div className="admin-orders-page">
      <div className="container">
        <div className="page-header">
          <h1>👑 Quản lý đơn hàng</h1>
          <p>Admin quản lý tất cả đơn hàng của tất cả shop</p>
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
          <div className="stat-card">
            <div className="stat-number">
              {orders.filter(order => order.status === 'delivered').length}
            </div>
            <div className="stat-label">Đã giao</div>
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
          <div className="filter-group">
            <label htmlFor="shop-filter">Lọc theo shop ID:</label>
            <input
              id="shop-filter"
              type="text"
              value={shopIdFilter}
              onChange={(e) => setShopIdFilter(e.target.value)}
              placeholder="Nhập shop ID..."
              className="filter-input"
            />
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h3>Không có đơn hàng nào</h3>
            <p>Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.</p>
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
                      <p className="shop-info">
                        🏪 Shop ID: {order.shop_id.slice(-8)}
                      </p>
                    </div>
                    <div className="order-status">
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      {getNextStatus(order.status) && (
                        <button
                          className="update-status-button"
                          onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                          disabled={updatingStatus === order.id}
                        >
                          {updatingStatus === order.id ? '⏳' : '➡️'} {getStatusText(getNextStatus(order.status)!)}
                        </button>
                      )}
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

export default AdminOrdersPage;
