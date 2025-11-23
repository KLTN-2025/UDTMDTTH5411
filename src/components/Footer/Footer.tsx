import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Company Info */}
          <div className="footer-section">
            <h3 className="footer-title">
              <span className="footer-logo">👗 Fashion Store</span>
            </h3>
            <p className="footer-description">
              Cửa hàng thời trang hàng đầu Việt Nam, 
              mang đến phong cách hiện đại với 
              bộ sưu tập thời trang đa dạng và chất lượng cao.
            </p>
            <div className="social-links">
              <button className="social-link" aria-label="Facebook">
                📘
              </button>
              <button className="social-link" aria-label="Instagram">
                📷
              </button>
              <button className="social-link" aria-label="Twitter">
                🐦
              </button>
              <button className="social-link" aria-label="YouTube">
                📺
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-subtitle">Liên kết nhanh</h4>
            <ul className="footer-links">
              <li><Link to="/about">Về chúng tôi</Link></li>
              <li><Link to="/contact">Liên hệ</Link></li>
              <li><Link to="/careers">Tuyển dụng</Link></li>
              <li><Link to="/news">Tin tức</Link></li>
              <li><Link to="/help">Trợ giúp</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="footer-section">
            <h4 className="footer-subtitle">Dịch vụ khách hàng</h4>
            <ul className="footer-links">
              <li><Link to="/shipping">Vận chuyển</Link></li>
              <li><Link to="/returns">Đổi trả</Link></li>
              <li><Link to="/warranty">Bảo hành</Link></li>
              <li><Link to="/faq">Câu hỏi thường gặp</Link></li>
              <li><Link to="/support">Hỗ trợ</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="footer-section">
            <h4 className="footer-subtitle">Danh mục</h4>
            <ul className="footer-links">
              <li><Link to="/category/electronics">Điện tử</Link></li>
              <li><Link to="/category/fashion">Thời trang</Link></li>
              <li><Link to="/category/home">Gia dụng</Link></li>
              <li><Link to="/category/sports">Thể thao</Link></li>
              <li><Link to="/category/books">Sách</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="footer-section">
            <h4 className="footer-subtitle">Thông tin liên hệ</h4>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <span>123 Đường ABC, Quận 1, TP.HCM</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span>1900 1234</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <span>support@shoponline.vn</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">🕒</span>
                <span>24/7 Hỗ trợ khách hàng</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="copyright">
              © 2024 Shop Online. Tất cả quyền được bảo lưu.
            </p>
            <div className="footer-bottom-links">
              <Link to="/privacy">Chính sách bảo mật</Link>
              <Link to="/terms">Điều khoản sử dụng</Link>
              <Link to="/cookies">Cookie</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

