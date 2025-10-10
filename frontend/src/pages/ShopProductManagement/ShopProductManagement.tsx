import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ShopProductManagement.css';

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

const ShopProductManagement: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockUpdate, setStockUpdate] = useState({ productId: '', newStock: 0 });

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
    if (user?.role === 'shop') {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/products/?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách sản phẩm');
      }
      
      const data = await response.json();
      // Lọc chỉ sản phẩm của shop hiện tại
      const shopProducts = (data.products || []).filter((product: Product) => 
        product.shop_id === user?.id
      );
      setProducts(shopProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải sản phẩm');
    } finally {
      setLoading(false);
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

  const handleUpdateStock = async () => {
    if (stockUpdate.newStock < 0) {
      alert('Số lượng tồn kho không được âm');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/products/${stockUpdate.productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stock: stockUpdate.newStock
        })
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật tồn kho');
      }

      setProducts(products.map(p => 
        p.id === stockUpdate.productId ? { ...p, stock: stockUpdate.newStock } : p
      ));
      
      setShowStockModal(false);
      setStockUpdate({ productId: '', newStock: 0 });
      alert('Cập nhật tồn kho thành công!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật tồn kho');
    }
  };

  const openStockModal = (product: Product) => {
    setStockUpdate({ productId: product.id, newStock: product.stock });
    setShowStockModal(true);
  };

  const getShopName = (shopId: string) => {
    return shopId === user?.id ? 'Cửa hàng của bạn' : 'Không xác định';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (user?.role !== 'shop') {
    return (
      <div className="shop-product-management">
        <div className="access-denied">
          <h2>Không có quyền truy cập</h2>
          <p>Chỉ shop mới có thể truy cập trang này.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shop-product-management">
        <div className="loading">Đang tải danh sách sản phẩm...</div>
      </div>
    );
  }

  return (
    <div className="shop-product-management">
      <div className="shop-product-header">
        <h2>Quản lý sản phẩm của bạn</h2>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={fetchProducts}
          >
            🔄 Làm mới
          </button>
          <a 
            href="/create-product" 
            className="create-product-btn"
          >
            ➕ Tạo sản phẩm mới
          </a>
        </div>
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
      </div>

      <div className="products-stats">
        <div className="stat-card">
          <div className="stat-number">{products.length}</div>
          <div className="stat-label">Tổng sản phẩm</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{products.filter(p => p.is_active).length}</div>
          <div className="stat-label">Đang bán</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{products.filter(p => p.stock === 0).length}</div>
          <div className="stat-label">Hết hàng</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{products.filter(p => p.is_featured).length}</div>
          <div className="stat-label">Nổi bật</div>
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
                  <div className="stock-info">
                    <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {product.stock}
                    </span>
                    <button 
                      className="update-stock-btn"
                      onClick={() => openStockModal(product)}
                    >
                      📝
                    </button>
                  </div>
                </td>
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
          <a href="/create-product" className="create-first-product-btn">
            Tạo sản phẩm đầu tiên
          </a>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Cập nhật tồn kho</h3>
              <button 
                className="close-btn"
                onClick={() => setShowStockModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Số lượng tồn kho mới:</label>
                <input
                  type="number"
                  value={stockUpdate.newStock}
                  onChange={(e) => setStockUpdate({
                    ...stockUpdate,
                    newStock: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  className="stock-input"
                />
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowStockModal(false)}
                >
                  Hủy
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleUpdateStock}
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopProductManagement;

