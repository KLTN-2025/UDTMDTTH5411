import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ImageUpload from '../../components/ImageUpload/ImageUpload';
import './CreateProductPage.css';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  original_price: number;
  category: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  stock: number;
  is_featured: boolean;
  is_new: boolean;
  discount_percentage: number;
}

interface ShopOption {
  id: string;
  name: string;
}

const CreateProductPage: React.FC = () => {
  const [formData, setFormData] = useState<ProductFormData>({
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [productImages, setProductImages] = useState<string[]>([]);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Tải danh sách shop khi là admin
  useEffect(() => {
    const fetchShops = async () => {
      if (!user || user.role !== 'admin') return;
      try {
        const token = localStorage.getItem('access_token');
        const resp = await fetch('http://localhost:8000/users/shops', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!resp.ok) {
          throw new Error('Không tải được danh sách cửa hàng');
        }
        const data = await resp.json();
        // API trả về List<UserResponse> với role="shop"
        const options: ShopOption[] = (Array.isArray(data) ? data : []).map((s: any) => ({ 
          id: s.id, 
          name: s.profile?.firstName && s.profile?.lastName 
            ? `${s.profile.firstName} ${s.profile.lastName}` 
            : s.username 
        }));
        setShops(options);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Lỗi tải danh sách shop');
      }
    };
    fetchShops();
  }, [user]);

  // Kiểm tra quyền truy cập
  if (!user || (user.role !== 'admin' && user.role !== 'shop')) {
    return (
      <div className="create-product-page">
        <div className="container">
          <div className="access-denied">
            <h2>Không có quyền truy cập</h2>
            <p>Chỉ admin và shop mới có thể tạo sản phẩm.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  const sizes = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'
  ];

  const colors = [
    'Đen', 'Trắng', 'Xám', 'Nâu', 'Xanh dương', 'Xanh lá', 'Đỏ', 'Hồng', 'Vàng', 'Cam', 'Tím'
  ];

  const materials = [
    'Cotton', 'Polyester', 'Denim', 'Leather', 'Canvas', 'Silk', 'Wool', 'Linen', 'Spandex'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    const numValue = type === 'number' ? parseFloat(value) || 0 : null;
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                numValue !== null ? numValue : value
      };
      
      // Validate: Giá bán phải cao hơn giá gốc
      if (name === 'price' && numValue !== null && updated.original_price && updated.original_price > 0 && numValue <= updated.original_price) {
        setErrors(prev => ({ ...prev, price: 'Giá bán phải cao hơn giá gốc (giá nhập hàng)' }));
      } else if (name === 'original_price' && numValue !== null && updated.price > 0 && numValue >= updated.price) {
        setErrors(prev => ({ ...prev, original_price: 'Giá gốc (giá nhập hàng) phải nhỏ hơn giá bán' }));
      } else {
        // Xóa lỗi nếu hợp lệ
        if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
        if (errors.original_price) setErrors(prev => ({ ...prev, original_price: '' }));
      }
      
      return updated;
    });

    // Clear error when user starts typing
    if (errors[name] && name !== 'price' && name !== 'original_price') {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (imageUrls: string[]) => {
    setProductImages(imageUrls);
    console.log('Images uploaded:', imageUrls);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên sản phẩm là bắt buộc';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả sản phẩm là bắt buộc';
    }

    if (!formData.original_price || formData.original_price <= 0) {
      newErrors.original_price = 'Giá gốc (giá nhập hàng) phải lớn hơn 0';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Giá bán phải lớn hơn 0';
    }

    // Validate: Giá bán phải cao hơn giá gốc
    if (formData.price > 0 && formData.original_price && formData.original_price > 0 && formData.price <= formData.original_price) {
      newErrors.price = 'Giá bán phải cao hơn giá gốc (giá nhập hàng)';
    }

    if (!formData.category) {
      newErrors.category = 'Danh mục là bắt buộc';
    }

    if (formData.stock < 0) {
      newErrors.stock = 'Số lượng tồn kho không được âm';
    }

    if (formData.discount_percentage && (formData.discount_percentage < 0 || formData.discount_percentage > 100)) {
      newErrors.discount_percentage = 'Phần trăm giảm giá phải từ 0 đến 100';
    }

    // Bắt buộc chọn shop khi là admin
    if (user && user.role === 'admin') {
      if (!selectedShopId) {
        newErrors.shop_id = 'Vui lòng chọn cửa hàng cho sản phẩm';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('User:', user);
      
      const response = await fetch('http://localhost:8000/products/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          // Gửi shop_id đúng theo vai trò
          shop_id: user.role === 'admin' ? selectedShopId : user.id,
          // Thêm ảnh sản phẩm
          images: productImages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Tạo sản phẩm thất bại');
      }

      const result = await response.json();
      console.log('Product created:', result);
      
      // Reset form
      setFormData({
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
      setSelectedShopId('');
      setProductImages([]);

      alert('Tạo sản phẩm thành công!');
      navigate('/');
      
    } catch (error) {
      console.error('Create product failed:', error);
      setError(error instanceof Error ? error.message : 'Tạo sản phẩm thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-product-page">
      <div className="container">
        <div className="create-product-container">
          <div className="create-product-header">
            <h1>Tạo sản phẩm mới</h1>
            <p>Thêm sản phẩm thời trang mới vào cửa hàng của bạn</p>
          </div>

          <form className="create-product-form" onSubmit={handleSubmit}>
            {error && (
              <div className="form-error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-row">
            {user.role === 'admin' && (
              <div className="form-group" style={{ width: '100%' }}>
                <label htmlFor="shop_id" className="form-label">
                  Chọn cửa hàng cho sản phẩm *
                </label>
                <select
                  id="shop_id"
                  name="shop_id"
                  value={selectedShopId}
                  onChange={(e) => {
                    setSelectedShopId(e.target.value);
                    if (errors.shop_id) {
                      setErrors(prev => ({ ...prev, shop_id: '' }));
                    }
                  }}
                  className={`form-input ${errors.shop_id ? 'form-input-error' : ''}`}
                >
                  <option value="">Chọn cửa hàng</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </select>
                {errors.shop_id && (
                  <span className="form-error">{errors.shop_id}</span>
                )}
              </div>
            )}
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  placeholder="Nhập tên sản phẩm"
                />
                {errors.name && (
                  <span className="form-error">{errors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Danh mục *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`form-input ${errors.category ? 'form-input-error' : ''}`}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <span className="form-error">{errors.category}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Mô tả sản phẩm *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`form-input ${errors.description ? 'form-input-error' : ''}`}
                placeholder="Mô tả chi tiết về sản phẩm"
                rows={4}
              />
              {errors.description && (
                <span className="form-error">{errors.description}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="original_price" className="form-label">
                  Giá gốc (VNĐ) *
                </label>
                <input
                  type="number"
                  id="original_price"
                  name="original_price"
                  value={formData.original_price}
                  onChange={handleChange}
                  className={`form-input ${errors.original_price ? 'form-input-error' : ''}`}
                  placeholder="Nhập giá nhập hàng"
                  min="0"
                  step="1000"
                />
                {errors.original_price && (
                  <span className="form-error">{errors.original_price}</span>
                )}
                <small className="form-hint">Giá nhập hàng (giá gốc) của sản phẩm</small>
              </div>

              <div className="form-group">
                <label htmlFor="price" className="form-label">
                  Giá bán (VNĐ) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={`form-input ${errors.price ? 'form-input-error' : ''}`}
                  placeholder="Nhập giá bán"
                  min="0"
                  step="1000"
                />
                {errors.price && (
                  <span className="form-error">{errors.price}</span>
                )}
                <small className="form-hint">
                  Giá bán cho khách hàng (phải cao hơn giá gốc)
                  {formData.original_price && formData.original_price > 0 && formData.price > formData.original_price && (
                    <span style={{ color: '#28a745', display: 'block', marginTop: '4px' }}>
                      Lợi nhuận: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.price - formData.original_price)}
                    </span>
                  )}
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="brand" className="form-label">
                  Thương hiệu
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Nhập thương hiệu"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stock" className="form-label">
                  Số lượng tồn kho *
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  className={`form-input ${errors.stock ? 'form-input-error' : ''}`}
                  placeholder="0"
                  min="0"
                />
                {errors.stock && (
                  <span className="form-error">{errors.stock}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="size" className="form-label">
                  Kích thước
                </label>
                <select
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Chọn kích thước</option>
                  {sizes.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="color" className="form-label">
                  Màu sắc
                </label>
                <select
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Chọn màu sắc</option>
                  {colors.map(color => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="material" className="form-label">
                Chất liệu
              </label>
              <select
                id="material"
                name="material"
                value={formData.material}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Chọn chất liệu</option>
                {materials.map(material => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discount_percentage" className="form-label">
                Giảm giá (%)
              </label>
              <input
                type="number"
                id="discount_percentage"
                name="discount_percentage"
                value={formData.discount_percentage}
                onChange={handleChange}
                className={`form-input ${errors.discount_percentage ? 'form-input-error' : ''}`}
                placeholder="0"
                min="0"
                max="100"
                step="1"
              />
              {errors.discount_percentage && (
                <span className="form-error">{errors.discount_percentage}</span>
              )}
              <small className="form-hint">
                Phần trăm giảm giá trên giá bán (nếu có)
                {formData.price > 0 && formData.discount_percentage && formData.discount_percentage > 0 && (
                  <span style={{ color: '#ff6b6b', display: 'block', marginTop: '4px' }}>
                    Giá sau giảm: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      formData.price * (1 - (formData.discount_percentage || 0) / 100)
                    )}
                  </span>
                )}
              </small>
            </div>

            <div className="form-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Sản phẩm nổi bật</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_new"
                  checked={formData.is_new}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Sản phẩm mới</span>
              </label>
            </div>

            <div className="form-section">
              <h3 className="section-title">Hình ảnh sản phẩm</h3>
              <p className="section-description">
                Upload ảnh sản phẩm lên Cloudinary. Bạn có thể upload nhiều ảnh cùng lúc.
              </p>
              <ImageUpload
                onUploadMultipleSuccess={handleImageUpload}
                multiple={true}
                maxFiles={10}
                folder="products"
                className="product-image-upload"
              />
              {productImages.length > 0 && (
                <div className="uploaded-images-info">
                  <p className="success-message">
                    ✅ Đã upload {productImages.length} ảnh thành công
                  </p>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <span>✨</span>
                    Tạo sản phẩm
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProductPage;
