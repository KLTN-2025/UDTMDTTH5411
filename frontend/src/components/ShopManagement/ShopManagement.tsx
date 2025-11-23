import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ShopManagement.css';

interface Shop {
  id: string;
  name: string;
  description?: string;
  email: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ShopManagement: React.FC = () => {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/shops', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách cửa hàng');
      }
      
      const data = await response.json();
      // Chuyển đổi UserResponse thành Shop format
      const shopsData = (Array.isArray(data) ? data : []).map((user: any) => ({
        id: user.id,
        name: user.profile?.firstName && user.profile?.lastName 
          ? `${user.profile.firstName} ${user.profile.lastName}` 
          : user.username,
        email: user.email,
        phone: user.phone,
        description: user.profile?.bio || '',
        address: user.profile?.address ? 
          `${user.profile.address.street || ''}, ${user.profile.address.city || ''}` : '',
        is_active: user.status === 'active',
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }));
      setShops(shopsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cửa hàng này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/users/${shopId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Không thể xóa cửa hàng');
      }

      setShops(shops.filter(s => s.id !== shopId));
      alert('Xóa cửa hàng thành công!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xóa cửa hàng');
    }
  };

  const handleToggleStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/users/${shopId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: !currentStatus ? 'active' : 'inactive'
        })
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật trạng thái cửa hàng');
      }

      setShops(shops.map(s => 
        s.id === shopId ? { ...s, is_active: !currentStatus } : s
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái');
    }
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.description && shop.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="shop-management">
        <div className="loading">Đang tải danh sách cửa hàng...</div>
      </div>
    );
  }

  return (
    <div className="shop-management">
      <div className="shop-management-header">
        <h2>Quản lý cửa hàng</h2>
        <button 
          className="create-shop-btn"
          onClick={() => setShowCreateForm(true)}
        >
          <span>🏪</span>
          Tạo cửa hàng mới
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Tìm kiếm cửa hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="shops-grid">
        {filteredShops.map((shop) => (
          <div key={shop.id} className="shop-card">
            <div className="shop-header">
              <div className="shop-info">
                <h3 className="shop-name">{shop.name}</h3>
                <p className="shop-email">{shop.email}</p>
              </div>
              <div className="shop-status">
                <button
                  className={`status-toggle ${shop.is_active ? 'active' : 'inactive'}`}
                  onClick={() => handleToggleStatus(shop.id, shop.is_active)}
                >
                  {shop.is_active ? 'Hoạt động' : 'Tạm dừng'}
                </button>
              </div>
            </div>
            
            {shop.description && (
              <div className="shop-description">
                <p>{shop.description}</p>
              </div>
            )}
            
            <div className="shop-details">
              {shop.phone && (
                <div className="detail-item">
                  <span className="detail-label">📞</span>
                  <span className="detail-value">{shop.phone}</span>
                </div>
              )}
              
              {shop.address && (
                <div className="detail-item">
                  <span className="detail-label">📍</span>
                  <span className="detail-value">{shop.address}</span>
                </div>
              )}
              
              <div className="detail-item">
                <span className="detail-label">📅</span>
                <span className="detail-value">
                  Tạo: {new Date(shop.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
            
            <div className="shop-actions">
              <button
                className="edit-btn"
                onClick={() => {
                  // TODO: Implement edit functionality
                  alert('Chức năng chỉnh sửa sẽ được thêm sau');
                }}
              >
                ✏️ Chỉnh sửa
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteShop(shop.id)}
              >
                🗑️ Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredShops.length === 0 && (
        <div className="no-shops">
          <p>Không tìm thấy cửa hàng nào</p>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Tạo cửa hàng mới</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Chuyển đến trang đăng ký cửa hàng để tạo cửa hàng mới.</p>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Hủy
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowCreateForm(false);
                    window.location.href = '/register-shop';
                  }}
                >
                  Tạo cửa hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopManagement;
