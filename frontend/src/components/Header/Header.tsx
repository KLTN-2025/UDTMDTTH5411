import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import './Header.css';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string; image_url?: string }[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const dropdownRef = useRef<HTMLLIElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Tải danh mục động từ backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:8000/categories');
        if (!res.ok) return;
        const data = await res.json();
        const list = (data || []).filter((c: any) => c?.is_active !== false);
        setCategories(list);
      } catch (_) {
        // ignore
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (location.pathname === '/search') {
        // If already on search page, update URL params
        setSearchParams({ q: searchQuery.trim() });
      } else {
        // Navigate to search page
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleCategoryDropdown = () => {
    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync search query with URL params when on search page
  useEffect(() => {
    if (location.pathname === '/search') {
      const urlQuery = searchParams.get('q') || '';
      if (urlQuery !== searchQuery) {
        setSearchQuery(urlQuery);
      }
    }
  }, [location.pathname, searchParams, searchQuery]);

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          {/* Logo */}
          <Link to="/" className="logo">
            <span className="logo-icon">🛍️</span>
            <span className="logo-text">Shop Online</span>
          </Link>

          {/* Search Bar */}
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                🔍
              </button>
            </div>
          </form>

          {/* Navigation */}
          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <ul className="nav-list">
              <li className="nav-item">
                <Link to="/" className="nav-link">Trang chủ</Link>
              </li>
              <li className="nav-item category-dropdown" ref={dropdownRef}>
                <button 
                  className="nav-link category-dropdown-button"
                  onClick={toggleCategoryDropdown}
                >
                  <span>Danh mục</span>
                  <span className={`dropdown-arrow ${isCategoryDropdownOpen ? 'open' : ''}`}>▼</span>
                </button>
                {isCategoryDropdownOpen && (
                  <div className="category-dropdown-menu">
                    <Link to="/category/all" className="category-dropdown-item">
                      <span className="category-icon">🛍️</span>
                      Tất cả
                    </Link>
                    {categories.map((c) => (
                      <Link key={c.id} to={`/category/${encodeURIComponent(c.name)}`} className="category-dropdown-item">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="category-thumb" />
                        ) : (
                          <span className="category-icon">🏷️</span>
                        )}
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            </ul>
          </nav>

          {/* User Actions */}
          <div className="user-actions">
            {isAuthenticated ? (
              <>
                <div className="user-info">
                  <span className="user-name">
                    Xin chào, {user?.profile?.firstName || user?.username}!
                  </span>
                  <span className="user-role">
                    ({user?.role})
                  </span>
                </div>
                
                {/* User Menu Dropdown */}
                <div className="user-menu-dropdown" ref={userMenuRef}>
                  <button className="user-menu-button" onClick={toggleUserMenu}>
                    <span className="action-icon">⚙️</span>
                    <span className="action-text">Menu</span>
                    <span className={`dropdown-arrow ${isUserMenuOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  {isUserMenuOpen && (
                    <div className="user-menu-content">
                    {user?.role === 'admin' && (
                      <>
                        <Link to="/admin" className="menu-item">
                          <span className="menu-icon">⚙️</span>
                          <span className="menu-text">Admin Panel</span>
                        </Link>
                        <Link to="/admin-orders" className="menu-item">
                          <span className="menu-icon">📋</span>
                          <span className="menu-text">Quản lý đơn hàng</span>
                        </Link>
                        <Link to="/admin/categories" className="menu-item">
                          <span className="menu-icon">🏷️</span>
                          <span className="menu-text">Quản trị danh mục</span>
                        </Link>
                      </>
                    )}
                    {user?.role === 'shop' && (
                      <>
                        <Link to="/shop-products" className="menu-item">
                          <span className="menu-icon">📦</span>
                          <span className="menu-text">Quản lý sản phẩm</span>
                        </Link>
                        <Link to="/shop-orders" className="menu-item">
                          <span className="menu-icon">📋</span>
                          <span className="menu-text">Xem đơn hàng</span>
                        </Link>
                      </>
                    )}
                    {user?.role === 'customer' && (
                      <>
                        <Link to="/customer-orders" className="menu-item">
                          <span className="menu-icon">📋</span>
                          <span className="menu-text">Đơn hàng của tôi</span>
                        </Link>
                        <Link to="/customer-profile" className="menu-item">
                          <span className="menu-icon">👤</span>
                          <span className="menu-text">Thông tin cá nhân</span>
                        </Link>
                      </>
                    )}
                    {user?.role === 'shop' && (
                      <Link to="/my-profile" className="menu-item">
                        <span className="menu-icon">👤</span>
                        <span className="menu-text">Thông tin cá nhân</span>
                      </Link>
                    )}
                    {(user?.role === 'admin' || user?.role === 'shop') && (
                      <Link to="/create-product" className="menu-item">
                        <span className="menu-icon">➕</span>
                        <span className="menu-text">Tạo sản phẩm</span>
                      </Link>
                    )}
                    <button onClick={handleLogout} className="menu-item logout-item">
                      <span className="menu-icon">🚪</span>
                      <span className="menu-text">Đăng xuất</span>
                    </button>
                    </div>
                  )}
                </div>
                
                <Link to="/cart" className="action-button cart-button">
                  <span className="action-icon">🛒</span>
                  <span className="action-text">Giỏ hàng</span>
                  {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="action-button">
                  <span className="action-icon">👤</span>
                  <span className="action-text">Đăng nhập</span>
                </Link>
                <div className="register-dropdown">
                  <button className="action-button register-button">
                    <span className="action-icon">📝</span>
                    <span className="action-text">Đăng ký</span>
                    <span className="dropdown-arrow">▼</span>
                  </button>
                  <div className="dropdown-menu">
                    <Link to="/register-customer" className="dropdown-item">
                      <span className="dropdown-icon">👤</span>
                      Khách hàng
                    </Link>
                    <Link to="/register-shop" className="dropdown-item">
                      <span className="dropdown-icon">🏪</span>
                      Cửa hàng
                    </Link>
                    {/* <Link to="/register-admin" className="dropdown-item">
                      <span className="dropdown-icon">👑</span>
                      Admin
                    </Link> */}
                  </div>
                </div>
                <Link to="/cart" className="action-button cart-button">
                  <span className="action-icon">🛒</span>
                  <span className="action-text">Giỏ hàng</span>
                  {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-toggle" onClick={toggleMenu}>
            <span className={`hamburger ${isMenuOpen ? 'hamburger-open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

