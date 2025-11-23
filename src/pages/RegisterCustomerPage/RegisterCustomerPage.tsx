import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerRegisterRequest } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './RegisterCustomerPage.css';

const RegisterCustomerPage: React.FC = () => {
  const { registerCustomer, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<CustomerRegisterRequest>({
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
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
    }
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
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
      } else {
        setFormData(prev => ({
          ...prev,
          profile: {
            ...prev.profile!,
            [parent]: value
          }
        }));
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

    try {
      await registerCustomer(formData);
      alert('Đăng ký thành công! Chào mừng bạn đến với nền tảng!');
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="register-customer-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Đăng ký tài khoản</h1>
          <p>Tạo tài khoản để mua sắm và trải nghiệm dịch vụ tốt nhất</p>
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
                  placeholder="customer@example.com"
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
            <h4>Lợi ích khi đăng ký</h4>
            <p>Với tài khoản khách hàng, bạn có thể:</p>
            <div className="permissions-list">
              <ul>
                <li>Mua sắm sản phẩm từ nhiều cửa hàng</li>
                <li>Quản lý giỏ hàng và đơn hàng</li>
                <li>Nhận thông báo về khuyến mãi</li>
                <li>Đánh giá và bình luận sản phẩm</li>
                <li>Lưu danh sách yêu thích</li>
                <li>Hỗ trợ khách hàng 24/7</li>
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
              {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterCustomerPage;

