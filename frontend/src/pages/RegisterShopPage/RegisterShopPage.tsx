import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShopRegisterRequest } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './RegisterShopPage.css';

const RegisterShopPage: React.FC = () => {
  const { registerShop, isLoading, error, clearError, user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ShopRegisterRequest>({
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'shop',
    profile: {
      firstName: '',
      lastName: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Vietnam'
      },
      dateOfBirth: '',
      gender: '',
      bio: ''
    },
    shopInfo: {
      shopName: '',
      description: '',
      category: '',
      website: '',
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: ''
      }
    }
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child, subChild] = name.split('.');
      
      if (parent === 'address') {
        setFormData(prev => ({
          ...prev,
          profile: {
            ...prev.profile!,
            address: {
              ...prev.profile!.address!,
              [child]: value
            }
          }
        }));
      } else if (parent === 'profile') {
        setFormData(prev => ({
          ...prev,
          profile: {
            ...prev.profile!,
            [child]: value
          }
        }));
      } else if (parent === 'shopInfo') {
        if (subChild) {
          setFormData(prev => ({
            ...prev,
            shopInfo: {
              ...prev.shopInfo!,
              [child]: {
                ...prev.shopInfo![child as keyof typeof prev.shopInfo] as any,
                [subChild]: value
              }
            }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            shopInfo: {
              ...prev.shopInfo!,
              [child]: value
            }
          }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (formData.password !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (!formData.shopInfo?.shopName) {
      alert('Vui lòng nhập tên cửa hàng');
      return;
    }

    try {
      await registerShop(formData);
      alert('Đăng ký shop thành công!');
      
      // Nếu admin đăng ký shop, quay lại trang admin với tab shops
      // Nếu không phải admin, chuyển về trang đăng nhập
      if (user && user.role === 'admin') {
        navigate('/admin?tab=shops');
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="register-shop-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Đăng ký tài khoản Shop</h1>
          <p>Tạo tài khoản cửa hàng để bán sản phẩm trên nền tảng</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-section">
            <h3>Thông tin tài khoản</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Tên người dùng *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder="Nhập tên người dùng"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="shop@example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Mật khẩu *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu"
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
                placeholder="+84 123 456 789"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Thông tin cửa hàng</h3>
            
            <div className="form-group">
              <label htmlFor="shopName">Tên cửa hàng *</label>
              <input
                type="text"
                id="shopName"
                name="shopInfo.shopName"
                value={formData.shopInfo?.shopName || ''}
                onChange={handleInputChange}
                required
                placeholder="Tên cửa hàng của bạn"
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="shopInfo.website"
                value={formData.shopInfo?.website || ''}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Mô tả cửa hàng</label>
              <textarea
                id="description"
                name="shopInfo.description"
                value={formData.shopInfo?.description || ''}
                onChange={handleInputChange}
                placeholder="Mô tả về cửa hàng và sản phẩm của bạn..."
                rows={3}
              />
            </div>

            <h4>Mạng xã hội</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="facebook">Facebook</label>
                <input
                  type="url"
                  id="facebook"
                  name="shopInfo.socialMedia.facebook"
                  value={formData.shopInfo?.socialMedia?.facebook || ''}
                  onChange={handleInputChange}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="instagram">Instagram</label>
                <input
                  type="url"
                  id="instagram"
                  name="shopInfo.socialMedia.instagram"
                  value={formData.shopInfo?.socialMedia?.instagram || ''}
                  onChange={handleInputChange}
                  placeholder="https://instagram.com/yourpage"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3>Thông tin cá nhân</h3>
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Ẩn' : 'Hiện'} thông tin chi tiết
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Tên</label>
                <input
                  type="text"
                  id="firstName"
                  name="profile.firstName"
                  value={formData.profile?.firstName || ''}
                  onChange={handleInputChange}
                  placeholder="Tên"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Họ</label>
                <input
                  type="text"
                  id="lastName"
                  name="profile.lastName"
                  value={formData.profile?.lastName || ''}
                  onChange={handleInputChange}
                  placeholder="Họ"
                />
              </div>
            </div>

            {showAdvanced && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dateOfBirth">Ngày sinh</label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="profile.dateOfBirth"
                      value={formData.profile?.dateOfBirth || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="gender">Giới tính</label>
                    <select
                      id="gender"
                      name="profile.gender"
                      value={formData.profile?.gender || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="bio">Mô tả cá nhân</label>
                  <textarea
                    id="bio"
                    name="profile.bio"
                    value={formData.profile?.bio || ''}
                    onChange={handleInputChange}
                    placeholder="Mô tả về bản thân..."
                    rows={3}
                  />
                </div>

                <h4>Địa chỉ</h4>
                <div className="form-group">
                  <label htmlFor="street">Địa chỉ đường</label>
                  <input
                    type="text"
                    id="street"
                    name="address.street"
                    value={formData.profile?.address?.street || ''}
                    onChange={handleInputChange}
                    placeholder="Số nhà, tên đường"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">Thành phố</label>
                    <input
                      type="text"
                      id="city"
                      name="address.city"
                      value={formData.profile?.address?.city || ''}
                      onChange={handleInputChange}
                      placeholder="Thành phố"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="state">Tỉnh/Thành phố</label>
                    <input
                      type="text"
                      id="state"
                      name="address.state"
                      value={formData.profile?.address?.state || ''}
                      onChange={handleInputChange}
                      placeholder="Tỉnh/Thành phố"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="zipCode">Mã bưu điện</label>
                    <input
                      type="text"
                      id="zipCode"
                      name="address.zipCode"
                      value={formData.profile?.address?.zipCode || ''}
                      onChange={handleInputChange}
                      placeholder="Mã bưu điện"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="country">Quốc gia</label>
                    <input
                      type="text"
                      id="country"
                      name="address.country"
                      value={formData.profile?.address?.country || ''}
                      onChange={handleInputChange}
                      placeholder="Quốc gia"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="role-info">
            <h4>Quyền hạn của Shop</h4>
            <p>Với tài khoản Shop, bạn có thể:</p>
            <div className="permissions-list">
              <ul>
                <li>Quản lý sản phẩm (thêm, sửa, xóa)</li>
                <li>Xem và xử lý đơn hàng</li>
                <li>Quản lý thông tin cửa hàng</li>
                <li>Xem báo cáo bán hàng</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/login')}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản Shop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterShopPage;

