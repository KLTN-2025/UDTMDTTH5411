import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AvatarUpload from '../../components/AvatarUpload/AvatarUpload';
import './ShopProfile.css';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  avatar?: string;
}

const ShopProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Vietnam'
    }
  });

  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (user) {
      // Load user profile data
      const profile = user.profile || {};
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: user.phone || '',
        bio: profile.bio || '',
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          state: profile.address?.state || '',
          zipCode: profile.address?.zipCode || '',
          country: profile.address?.country || 'Vietnam'
        }
      });
      setAvatarUrl(profile.avatar || '');
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) {
      setMessage('Không tìm thấy thông tin người dùng');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:8000/auth/users/${user.id}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Lỗi upload avatar');
      }

      const result = await response.json();
      setAvatarUrl(result.avatar_url);
      setMessage('Cập nhật avatar thành công!');
      setMessageType('success');
    } catch (error) {
      console.error('Avatar upload error:', error);
      setMessage(`Lỗi upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setMessage('Không tìm thấy thông tin người dùng');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`http://localhost:8000/auth/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          phone: formData.phone,
          profile: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            bio: formData.bio,
            address: formData.address
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Lỗi cập nhật thông tin');
      }

      setMessage('Cập nhật thông tin thành công!');
      setMessageType('success');
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage(`Lỗi cập nhật: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="shop-profile">
        <div className="container">
          <div className="profile-header">
            <h1>Vui lòng đăng nhập để xem thông tin cá nhân</h1>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'shop') {
    return (
      <div className="shop-profile">
        <div className="container">
          <div className="profile-header">
            <h1>Chỉ shop mới có thể truy cập trang này</h1>
            <p>Bạn cần có quyền shop để quản lý thông tin cá nhân</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-profile">
      <div className="container">
        <div className="profile-header">
          <h1>Thông tin cá nhân</h1>
          <p>Quản lý thông tin và ảnh đại diện của bạn</p>
        </div>

        <div className="profile-content">
          <div className="profile-card">
            <div className="avatar-section">
              <h3>Ảnh đại diện</h3>
              <div className="avatar-container">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="current-avatar" />
                ) : (
                  <div className="default-avatar">
                    <span>👤</span>
                  </div>
                )}
                <AvatarUpload onUpload={handleAvatarUpload} loading={uploading} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <h3>Thông tin cơ bản</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">Tên</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Nhập tên"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Họ</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Nhập họ"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Số điện thoại</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Giới thiệu</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Giới thiệu về shop của bạn"
                  rows={4}
                />
              </div>

              <h3>Địa chỉ</h3>
              
              <div className="form-group">
                <label htmlFor="address.street">Địa chỉ</label>
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  placeholder="Số nhà, tên đường"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="address.city">Thành phố</label>
                  <input
                    type="text"
                    id="address.city"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    placeholder="Thành phố"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="address.state">Tỉnh/Thành phố</label>
                  <input
                    type="text"
                    id="address.state"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    placeholder="Tỉnh/Thành phố"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="address.zipCode">Mã bưu điện</label>
                  <input
                    type="text"
                    id="address.zipCode"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                    placeholder="Mã bưu điện"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="address.country">Quốc gia</label>
                  <input
                    type="text"
                    id="address.country"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleInputChange}
                    placeholder="Quốc gia"
                  />
                </div>
              </div>

              {message && (
                <div className={`message ${messageType}`}>
                  {message}
                </div>
              )}

              <button type="submit" className="save-button" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopProfile;
