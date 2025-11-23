import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ProductManagement.css';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  stock: number;
  shop_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  discount_percentage?: number;
  created_at: string;
  updated_at: string;
}

interface Shop {
  id: string;
  name: string;
}

const ProductManagement: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedShop, setSelectedShop] = useState('');

  const categories = [
    { value: 'all', label: 'Tất cả' },
    { value: 'tshirts', label: 'T-Shirts' },
    { value: 'shirts', label: 'Shirts' },
    { value: 'outerwear', label: 'Outerwear' },
    { value: 'shorts', label: 'Shorts' },
    { value: 'jeans', label: 'Jeans' },
    { value: 'pants', label: 'Pants' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'jewelry', label: 'Jewelry' }
  ];

  useEffect(() => {
    fetchProducts();
    fetchShops();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/products/?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách sản phẩm');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const fetchShops = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/users/shops', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách cửa hàng');
      }
      
      const data = await response.json();
      // Chuyển đổi UserResponse thành Shop format
      const shopsData = (Array.isArray(data) ? data : []).map((user: any) => ({
        id: user.id,
        name: user.profile?.firstName && user.profile?.lastName 
          ? `${user.profile.firstName} ${user.profile.lastName}` 
          : user.username,
        email: user.email,
        phone: user.phone,
        description: user.profile?.bio || '',
        address: user.profile?.address ? 
          `${user.profile.address.street || ''}, ${user.profile.address.city || ''}` : '',
        is_active: user.status === 'active',
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }));
      setShops(shopsData);
    } catch (err) {
      console.error('Error fetching shops:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Không thể xóa sản phẩm');
      }

      setProducts(products.filter(p => p.id !== productId));
      alert('Xóa sản phẩm thành công!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xóa sản phẩm');
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: !currentStatus
        })
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật trạng thái sản phẩm');
      }

      setProducts(products.map(p => 
        p.id === productId ? { ...p, is_active: !currentStatus } : p
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái');
    }
  };

  const getShopName = (shopId: string) => {
    const shop = shops.find(s => s.id === shopId);
    return shop ? shop.name : 'Không xác định';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesShop = !selectedShop || product.shop_id === selectedShop;
    
    return matchesSearch && matchesCategory && matchesShop;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="product-management">
        <div className="loading">Đang tải danh sách sản phẩm...</div>
      </div>
    );
  }

  return (
    <div className="product-management">
      <div className="product-management-header">
        <h2>Quản lý sản phẩm</h2>
        <button 
          className="create-product-btn"
          onClick={() => setShowCreateForm(true)}
        >
          <span>➕</span>
          Tạo sản phẩm mới
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="filter-select"
          >
            <option value="">Tất cả cửa hàng</option>
            {shops.map(shop => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Tồn kho</th>
              <th>Cửa hàng</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-description">
                      {product.description.substring(0, 50)}...
                    </div>
                  </div>
                </td>
                <td>
                  <span className="category-badge">
                    {categories.find(c => c.value === product.category)?.label || product.category}
                  </span>
                </td>
                <td>
                  <div className="price-info">
                    <div className="current-price">{formatPrice(product.price)}</div>
                    {product.original_price && product.original_price > product.price && (
                      <div className="original-price">{formatPrice(product.original_price)}</div>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {product.stock}
                  </span>
                </td>
                <td>{getShopName(product.shop_id)}</td>
                <td>
                  <button
                    className={`status-toggle ${product.is_active ? 'active' : 'inactive'}`}
                    onClick={() => handleToggleStatus(product.id, product.is_active)}
                  >
                    {product.is_active ? 'Hoạt động' : 'Tạm dừng'}
                  </button>
                </td>
                <td>
                  {new Date(product.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => setEditingProduct(product)}
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="no-products">
          <p>Không tìm thấy sản phẩm nào</p>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Tạo sản phẩm mới</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Chuyển đến trang tạo sản phẩm để thêm sản phẩm mới.</p>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Hủy
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowCreateForm(false);
                    window.location.href = '/create-product';
                  }}
                >
                  Tạo sản phẩm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
