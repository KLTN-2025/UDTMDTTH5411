import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, User } from '../../services/api';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'shop' | 'customer'>('customer');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await apiService.getAllUsers();
      setUsers(usersData);
    } catch (err) {
      setError('Không thể tải danh sách người dùng');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      await apiService.updateUserStatus(userId, newStatus);
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      setSelectedUser(null);
    } catch (err) {
      setError('Không thể cập nhật trạng thái người dùng');
      console.error('Error updating user status:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#73D13D';
      case 'inactive': return '#A3A3A3';
      case 'suspended': return '#FF4D4F';
      default: return '#A3A3A3';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FF8FAB';
      case 'shop': return '#40A9FF';
      case 'customer': return '#36CFC9';
      default: return '#A3A3A3';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">Đang tải danh sách người dùng...</div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>Quản lý người dùng</h2>
        <button 
          className="create-user-btn"
          onClick={() => setShowCreateForm(true)}
        >
          <span>👤</span>
          Tạo tài khoản mới
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
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="shop">Shop</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Tên người dùng</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Số điện thoại</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.profile?.firstName?.[0] || user.username[0]}
                    </div>
                    <div>
                      <div className="username">{user.username}</div>
                      {user.profile?.firstName && user.profile?.lastName && (
                        <div className="full-name">
                          {user.profile.firstName} {user.profile.lastName}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(user.role) }}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  >
                    {user.status}
                  </span>
                </td>
                <td>{user.phone || 'N/A'}</td>
                <td>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </td>
                <td>
                  <button 
                    className="action-btn"
                    onClick={() => setSelectedUser(user)}
                  >
                    Quản lý
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-users">
          <p>Không tìm thấy người dùng nào</p>
        </div>
      )}

      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Quản lý người dùng: {selectedUser.username}</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="user-details">
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Vai trò:</strong> {selectedUser.role}</p>
                <p><strong>Quyền:</strong> {selectedUser.permissions.join(', ')}</p>
                <p><strong>Số điện thoại:</strong> {selectedUser.phone || 'N/A'}</p>
                {selectedUser.profile?.bio && (
                  <p><strong>Mô tả:</strong> {selectedUser.profile.bio}</p>
                )}
              </div>
              <div className="status-actions">
                <h4>Thay đổi trạng thái:</h4>
                <div className="status-buttons">
                  <button 
                    className={`status-btn ${selectedUser.status === 'active' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedUser.id, 'active')}
                  >
                    Kích hoạt
                  </button>
                  <button 
                    className={`status-btn ${selectedUser.status === 'inactive' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedUser.id, 'inactive')}
                  >
                    Vô hiệu hóa
                  </button>
                  <button 
                    className={`status-btn ${selectedUser.status === 'suspended' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedUser.id, 'suspended')}
                  >
                    Tạm khóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Tạo tài khoản mới</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="create-form">
                <div className="form-group">
                  <label>Loại tài khoản:</label>
                  <select 
                    value={userType} 
                    onChange={(e) => setUserType(e.target.value as 'admin' | 'shop' | 'customer')}
                  >
                    <option value="customer">Khách hàng</option>
                    <option value="shop">Cửa hàng</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
                <p className="form-note">
                  Chọn loại tài khoản để tạo. Mỗi loại sẽ có quyền hạn khác nhau.
                </p>
                <div className="form-actions">
                  <button 
                    className="create-btn"
                    onClick={() => {
                      // Redirect to appropriate registration page
                      window.location.href = `/register-${userType}`;
                    }}
                  >
                    Tạo tài khoản {userType}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

