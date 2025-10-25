import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HeroSection.css';

const HeroSection: React.FC = () => {
  const [categories, setCategories] = useState<{ id: string; name: string; image_url?: string }[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:8000/categories');
        if (!res.ok) return;
        const data = await res.json();
        setCategories(data || []);
      } catch (_) {
        // ignore
      }
    };
    fetchCategories();
  }, []);
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Thời trang
              <span className="hero-highlight"> hiện đại</span>
            </h1>
            <p className="hero-description">
              Khám phá bộ sưu tập thời trang đa dạng với phong cách 
              hiện đại, chất lượng cao. Từ T-shirts, Shirts đến 
              Outerwear, Jeans và phụ kiện thời trang.
            </p>
            {categories.length >= 2 && (
              <div className="hero-actions">
                <Link to={`/category/${encodeURIComponent(categories[0].name)}`} className="btn btn-primary hero-btn">
                  <span>🏷️</span>
                  {categories[0].name}
                </Link>
                <Link to={`/category/${encodeURIComponent(categories[1].name)}`} className="btn btn-secondary hero-btn">
                  <span>🏷️</span>
                  {categories[1].name}
                </Link>
              </div>
            )}
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Sản phẩm thời trang</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">50K+</span>
                <span className="stat-label">Khách hàng</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">98%</span>
                <span className="stat-label">Hài lòng</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-image-wrapper">
              {categories.slice(0,4).map((c, idx) => (
                <div key={c.id} className={`floating-card card-${idx+1}`}>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="card-img" />
                  ) : (
                    <div className="card-icon">🏷️</div>
                  )}
                  <div className="card-text">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

