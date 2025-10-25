import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './EditProductPage.css';

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
  images: string[];
  stock: number;
  shop_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  discount_percentage?: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
}

const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    original_price: 0,
    category: '',
    brand: '',
    size: '',
    color: '',
    material: '',
    stock: 0,
    is_featured: false,
    is_new: false,
    discount_percentage: 0
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải thông tin sản phẩm');
      }

      const productData = await response.json();
      
      // Kiểm tra quyền sở hữu (shop chỉ có thể edit sản phẩm của mình)
      if (user?.role === 'shop' && productData.shop_id !== user.id) {
        throw new Error('Bạn không có quyền chỉnh sửa sản phẩm này');
      }

      setProduct(productData);
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        price: productData.price || 0,
        original_price: productData.original_price || 0,
        category: productData.category || '',
        brand: productData.brand || '',
        size: productData.size || '',
        color: productData.color || '',
        material: productData.material || '',
        stock: productData.stock || 0,
        is_featured: productData.is_featured || false,
        is_new: productData.is_new || false,
        discount_percentage: productData.discount_percentage || 0
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (user?.role !== 'shop' && user?.role !== 'admin') {
      navigate('/');
      return;
    }
    
    if (id) {
      fetchProduct();
      fetchCategories();
    }
  }, [id, user, navigate, fetchProduct]);


  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/categories/');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Xóa lỗi khi user bắt đầu nhập
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên sản phẩm là bắt buộc';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả sản phẩm là bắt buộc';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Giá sản phẩm phải lớn hơn 0';
    }

    if (!formData.category) {
      newErrors.category = 'Danh mục là bắt buộc';
    }

    if (formData.stock < 0) {
      newErrors.stock = 'Số lượng tồn kho không được âm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('folder', 'products');

      const response = await fetch('http://localhost:8000/upload/multiple', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Lỗi upload ảnh');
      }

      const data = await response.json();
      const newImages = [...(product?.images || []), ...data.urls];
      
      setProduct(prev => prev ? { ...prev, images: newImages } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi upload ảnh');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    if (product) {
      const newImages = product.images.filter((_, i) => i !== index);
      setProduct({ ...product, images: newImages });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const updateData = {
        ...formData,
        images: product?.images || []
      };

      const response = await fetch(`http://localhost:8000/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Lỗi cập nhật sản phẩm');
      }

      // Chuyển về trang quản lý sản phẩm
      navigate('/shop-products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-product-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="edit-product-page">
        <div className="error-container">
          <h2>Sản phẩm không tồn tại</h2>
          <p>Không thể tìm thấy sản phẩm với ID này.</p>
          <button onClick={() => navigate('/shop-products')} className="back-btn">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-product-page">
      <div className="edit-product-container">
        <div className="edit-product-header">
          <h1>Chỉnh sửa sản phẩm</h1>
          <button 
            onClick={() => navigate('/shop-products')} 
            className="back-btn"
          >
            ← Quay lại
          </button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="edit-product-form">
          <div className="form-grid">
            {/* Thông tin cơ bản */}
            <div className="form-section">
              <h3>Thông tin cơ bản</h3>
              
              <div className="form-group">
                <label htmlFor="name">Tên sản phẩm *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Nhập tên sản phẩm"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="description">Mô tả sản phẩm *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={errors.description ? 'error' : ''}
                  placeholder="Mô tả chi tiết về sản phẩm"
                  rows={4}
                />
                {errors.description && <span className="error-text">{errors.description}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Giá bán *</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={errors.price ? 'error' : ''}
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                  {errors.price && <span className="error-text">{errors.price}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="original_price">Giá gốc</label>
                  <input
                    type="number"
                    id="original_price"
                    name="original_price"
                    value={formData.original_price}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="category">Danh mục *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={errors.category ? 'error' : ''}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && <span className="error-text">{errors.category}</span>}
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <div className="form-section">
              <h3>Thông tin chi tiết</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="brand">Thương hiệu</label>
                  <input
                    type="text"
                    id="brand"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    placeholder="Nhập thương hiệu"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="size">Kích thước</label>
                  <input
                    type="text"
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    placeholder="S, M, L, XL..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="color">Màu sắc</label>
                  <input
                    type="text"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="Đỏ, xanh, đen..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="material">Chất liệu</label>
                  <input
                    type="text"
                    id="material"
                    name="material"
                    value={formData.material}
                    onChange={handleInputChange}
                    placeholder="Cotton, polyester..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="stock">Số lượng tồn kho</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className={errors.stock ? 'error' : ''}
                    placeholder="0"
                    min="0"
                  />
                  {errors.stock && <span className="error-text">{errors.stock}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="discount_percentage">Giảm giá (%)</label>
                  <input
                    type="number"
                    id="discount_percentage"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Hình ảnh sản phẩm */}
            <div className="form-section">
              <h3>Hình ảnh sản phẩm</h3>
              
              <div className="image-upload-area">
                <input
                  type="file"
                  id="image-upload"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  style={{ display: 'none' }}
                />
                <label htmlFor="image-upload" className="upload-btn">
                  {uploadingImages ? 'Đang upload...' : '📷 Thêm ảnh'}
                </label>
              </div>

              {product.images && product.images.length > 0 && (
                <div className="image-preview-grid">
                  {product.images.map((image, index) => (
                    <div key={index} className="image-preview-item">
                      <img src={image} alt={`Sản phẩm ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-image-btn"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tùy chọn */}
            <div className="form-section">
              <h3>Tùy chọn</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  Sản phẩm nổi bật
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_new"
                    checked={formData.is_new}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  Sản phẩm mới
                </label>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/shop-products')}
              className="cancel-btn"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="save-btn"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductPage;

