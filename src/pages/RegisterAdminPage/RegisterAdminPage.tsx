import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './RegisterAdminPage.css';

const RegisterAdminPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsLoading(true);

    try {
      // Validation
      const newErrors: string[] = [];
      
      if (!formData.username.trim()) newErrors.push('Tên người dùng là bắt buộc');
      if (!formData.email.trim()) newErrors.push('Email là bắt buộc');
      if (!formData.password) newErrors.push('Mật khẩu là bắt buộc');
      if (formData.password !== formData.confirmPassword) newErrors.push('Mật khẩu xác nhận không khớp');
      
      if (newErrors.length > 0) {
        setErrors(newErrors);
        setIsLoading(false);
        return;
      }

      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'admin',
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      });

      navigate('/admin');
    } catch (error: any) {
      setErrors([error.message || 'Có lỗi xảy ra khi đăng ký']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-admin-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Đăng ký Admin</h1>
          <p>Tạo tài khoản quản trị viên mới</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {errors.length > 0 && (
            <div className="form-error-message">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Tên người dùng *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
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
                onChange={handleChange}
                required
                placeholder="Nhập email"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Tên</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
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
                onChange={handleChange}
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
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Mật khẩu *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Nhập mật khẩu"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Nhập lại mật khẩu"
              />
            </div>
          </div>

          <div className="role-info">
            <h3>👑 Quyền Admin</h3>
            <p>Với tài khoản admin, bạn sẽ có quyền:</p>
            <ul>
              <li>Quản lý tất cả người dùng</li>
              <li>Quản lý tất cả sản phẩm</li>
              <li>Quản lý đơn hàng toàn hệ thống</li>
              <li>Truy cập báo cáo và thống kê</li>
            </ul>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký Admin'}
          </button>
        </form>

        <div className="auth-links">
          <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
          <p>Hoặc <Link to="/register-customer">Đăng ký khách hàng</Link> | <Link to="/register-shop">Đăng ký cửa hàng</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterAdminPage;
