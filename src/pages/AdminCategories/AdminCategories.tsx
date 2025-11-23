import React, { useEffect, useState } from 'react';
import './AdminCategories.css';

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  is_active: boolean;
}

const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('access_token') || '';

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:8000/categories');
      if (!res.ok) throw new Error('Không thể tải danh mục');
      const data = await res.json();
      setCategories(data);
    } catch (e: any) {
      setError(e.message || 'Lỗi tải danh mục');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    setError('');
    setMessage('');
    if (!window.confirm(`Xoá danh mục "${name}"?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Xoá danh mục thất bại');
      }
      setMessage('Đã xoá danh mục');
      fetchCategories();
    } catch (e: any) {
      setError(e.message || 'Lỗi xoá danh mục');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!name.trim()) {
      setError('Tên danh mục không được trống');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Tạo danh mục thất bại');
      }
      const created = await res.json();

      // Nếu có ảnh, upload ảnh cho danh mục vừa tạo
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const up = await fetch(`http://localhost:8000/categories/${created.id}/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (!up.ok) {
          const err = await up.json().catch(() => ({}));
          throw new Error(err.detail || 'Upload ảnh danh mục thất bại');
        }
      }

      setName('');
      setDescription('');
      setImageFile(null);
      setMessage('Tạo danh mục thành công');
      fetchCategories();
    } catch (e: any) {
      setError(e.message || 'Lỗi tạo danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateImage = async (id: string, file: File | null) => {
    if (!file) return;
    setError('');
    setMessage('');
    try {
      setUploadingId(id);
      const formData = new FormData();
      formData.append('file', file);
      const up = await fetch(`http://localhost:8000/categories/${id}/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!up.ok) {
        const err = await up.json().catch(() => ({}));
        throw new Error(err.detail || 'Cập nhật ảnh thất bại');
      }
      setMessage('Đã cập nhật ảnh danh mục');
      fetchCategories();
    } catch (e: any) {
      setError(e.message || 'Lỗi cập nhật ảnh');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="admin-categories">
      <div className="container">

        <form onSubmit={handleCreate} className="category-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Tên danh mục</label>
              <input
                type="text"
                placeholder="Ví dụ: Shirt, Pants..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Mô tả (tuỳ chọn)</label>
              <input
                type="text"
                placeholder="Mô tả ngắn về danh mục"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Ảnh đại diện (tuỳ chọn)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="file-input"
              />
            </div>
          </div>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo danh mục'}
          </button>
          {error && <div className="error-msg">{error}</div>}
          {message && <div className="success-msg">{message}</div>}
        </form>

        <h2 className="section-title">Danh sách danh mục</h2>
        <ul className="category-list">
          {categories.map((c) => (
            <li key={c.id} className="category-item">
              <div className="item-info">
                {(c as any).image_url ? (
                  <img src={(c as any).image_url} alt={c.name} className="category-thumb" />
                ) : (
                  <div className="category-thumb placeholder">🏷️</div>
                )}
                <div className="meta">
                  <div className="name">{c.name}</div>
                  {!c.is_active && <div className="badge">Đã tắt</div>}
                </div>
              </div>
              <div className="item-actions">
                <label className="secondary-btn">
                  {uploadingId === c.id ? 'Đang cập nhật...' : 'Đổi ảnh'}
                  <input type="file" accept="image/*" onChange={(e) => handleUpdateImage(c.id, e.target.files?.[0] || null)} />
                </label>
                <button onClick={() => handleDelete(c.id, c.name)} className="danger-btn">Xoá</button>
              </div>
            </li>
          ))}
          {categories.length === 0 && <li className="empty">Chưa có danh mục nào</li>}
        </ul>
      </div>
    </div>
  );
};

export default AdminCategories;


