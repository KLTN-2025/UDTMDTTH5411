import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './RegisterPage.css';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear auth error when user starts typing
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Tên người dùng là bắt buộc';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Tên người dùng phải có ít nhất 3 ký tự';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Tên là bắt buộc';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Họ là bắt buộc';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'Bạn phải đồng ý với điều khoản sử dụng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: 'customer',
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      });
      navigate('/login');
    } catch (error) {
      // Error đã được xử lý trong AuthContext
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="register-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <Link to="/" className="auth-logo">
                <span className="logo-icon">🛍️</span>
                <span className="logo-text">Shop Online</span>
              </Link>
              <h1 className="auth-title">Đăng ký tài khoản</h1>
              <p className="auth-subtitle">
                Tạo tài khoản mới để bắt đầu mua sắm với chúng tôi.
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="form-error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Tên người dùng
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`form-input ${errors.username ? 'form-input-error' : ''}`}
                  placeholder="Nhập tên người dùng"
                />
                {errors.username && (
                  <span className="form-error">{errors.username}</span>
                )}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    Tên
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`form-input ${errors.firstName ? 'form-input-error' : ''}`}
                    placeholder="Nhập tên"
                  />
                  {errors.firstName && (
                    <span className="form-error">{errors.firstName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">
                    Họ
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`form-input ${errors.lastName ? 'form-input-error' : ''}`}
                    placeholder="Nhập họ"
                  />
                  {errors.lastName && (
                    <span className="form-error">{errors.lastName}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                  placeholder="Nhập email của bạn"
                />
                {errors.email && (
                  <span className="form-error">{errors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                  placeholder="Nhập số điện thoại"
                />
                {errors.phone && (
                  <span className="form-error">{errors.phone}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                    placeholder="Nhập mật khẩu"
                  />
                  {errors.password && (
                    <span className="form-error">{errors.password}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`form-input ${errors.confirmPassword ? 'form-input-error' : ''}`}
                    placeholder="Nhập lại mật khẩu"
                  />
                  {errors.confirmPassword && (
                    <span className="form-error">{errors.confirmPassword}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">
                    Tôi đồng ý với{' '}
                    <Link to="/terms" className="terms-link">
                      Điều khoản sử dụng
                    </Link>
                    {' '}và{' '}
                    <Link to="/privacy" className="terms-link">
                      Chính sách bảo mật
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <span className="form-error">{errors.agreeToTerms}</span>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary auth-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <span>📝</span>
                    Đăng ký
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>Hoặc</span>
            </div>

            <div className="social-login">
              <button className="social-btn google-btn">
                <span>🔍</span>
                Đăng ký với Google
              </button>
              <button className="social-btn facebook-btn">
                <span>📘</span>
                Đăng ký với Facebook
              </button>
            </div>

            <div className="auth-footer">
              <p>
                Đã có tài khoản?{' '}
                <Link to="/login" className="auth-link">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

