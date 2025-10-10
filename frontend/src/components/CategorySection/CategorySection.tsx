import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './CategorySection.css';

interface ApiCategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

const CategorySection: React.FC = () => {
  const [categories, setCategories] = useState<ApiCategory[]>([]);

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
    <section className="category-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Danh mục thời trang</h2>
          <p className="section-description">
            Khám phá bộ sưu tập thời trang đa dạng với phong cách hiện đại
          </p>
        </div>
        
        <div className="categories-grid">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${encodeURIComponent(category.name)}`}
              className="category-card"
              
            >
              {category.image_url ? (
                <img src={category.image_url} alt={category.name} className="category-thumb" />
              ) : (
                <div className="category-icon">🏷️</div>
              )}
              <div className="category-content">
                <h3 className="category-name">{category.name}</h3>
                {category.description && (
                  <p className="category-description">{category.description}</p>
                )}
              </div>
              <div className="category-overlay"></div>
            </Link>
          ))}
        </div>
        
        <div className="section-footer">
          <Link to="/categories" className="btn btn-secondary">
            Xem tất cả danh mục
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategorySection;

