import React, { useState } from 'react';
import './NewsletterSection.css';

const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubscribed(true);
      setIsLoading(false);
      setEmail('');
    }, 1000);
  };

  if (isSubscribed) {
    return (
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-success">
            <div className="success-icon">✅</div>
            <h3>Cảm ơn bạn đã đăng ký!</h3>
            <p>Chúng tôi sẽ gửi thông tin khuyến mãi mới nhất đến email của bạn.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="newsletter-section">
      <div className="container">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h2 className="newsletter-title">
              Cập nhật xu hướng thời trang
              <span className="newsletter-highlight"> mới nhất</span>
            </h2>
            <p className="newsletter-description">
              Đăng ký ngay để nhận thông báo về bộ sưu tập mới, 
              xu hướng thời trang và ưu đãi độc quyền.
            </p>
          </div>
          
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="newsletter-input"
                required
              />
              <button 
                type="submit" 
                className="newsletter-btn"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <span>📧</span>
                    Đăng ký ngay
                  </>
                )}
              </button>
            </div>
            <p className="newsletter-note">
              Chúng tôi cam kết không spam và bảo mật thông tin của bạn.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;

