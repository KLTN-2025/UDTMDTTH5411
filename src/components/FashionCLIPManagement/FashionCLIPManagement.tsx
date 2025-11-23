import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import './FashionCLIPManagement.css';

interface FashionCLIPStats {
  index_loaded: boolean;
  num_products: number;
  dimension: number;
  database: string;
  collection: string;
  image_field: string;
}

const FashionCLIPManagement: React.FC = () => {
  const [stats, setStats] = useState<FashionCLIPStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [lastBuildTime, setLastBuildTime] = useState<string>('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const statsData = await apiService.getFashionCLIPStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lấy thống kê');
    } finally {
      setLoading(false);
    }
  };

  const buildIndex = async (force: boolean = false) => {
    try {
      setBuilding(true);
      setError('');
      setSuccess('');
      
      const result = await apiService.buildFashionCLIPIndex(force);
      
      if (result.success) {
        setSuccess(result.message);
        setLastBuildTime(result.timestamp);
        // Refresh stats after building
        await fetchStats();
      } else {
        setError('Build index thất bại');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi build index');
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getStatusColor = (loaded: boolean) => {
    return loaded ? '#10b981' : '#ef4444';
  };

  const getStatusText = (loaded: boolean) => {
    return loaded ? 'Đã tải' : 'Chưa tải';
  };

  return (
    <div className="fashionclip-management">
      <div className="fashionclip-header">
        <h2>🎨 FashionCLIP Management</h2>
        <p>Quản lý hệ thống tìm kiếm hình ảnh tương tự</p>
      </div>

      {/* Stats Card */}
      <div className="stats-card">
        <div className="stats-header">
          <h3>📊 Thống kê Index</h3>
          <button 
            className="refresh-button"
            onClick={fetchStats}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Làm mới
          </button>
        </div>

        {stats ? (
          <div className="stats-content">
            <div className="stat-item">
              <span className="stat-label">Trạng thái:</span>
              <span 
                className="stat-value status"
                style={{ color: getStatusColor(stats.index_loaded) }}
              >
                {getStatusText(stats.index_loaded)}
              </span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Số sản phẩm:</span>
              <span className="stat-value">{stats.num_products}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Dimension:</span>
              <span className="stat-value">{stats.dimension}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Database:</span>
              <span className="stat-value">{stats.database}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Collection:</span>
              <span className="stat-value">{stats.collection}</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">Image field:</span>
              <span className="stat-value">{stats.image_field}</span>
            </div>
          </div>
        ) : (
          <div className="loading-stats">
            {loading ? 'Đang tải thống kê...' : 'Không có dữ liệu'}
          </div>
        )}
      </div>

      {/* Build Index Card */}
      <div className="build-card">
        <div className="build-header">
          <h3>🏗️ Build Index</h3>
          <p>Xây dựng lại vector index từ database</p>
        </div>

        <div className="build-content">
          <div className="build-info">
            <p>Build index sẽ:</p>
            <ul>
              <li>Đọc tất cả sản phẩm có hình ảnh từ database</li>
              <li>Extract features bằng FashionCLIP</li>
              <li>Tạo FAISS index để tìm kiếm nhanh</li>
              <li>Cập nhật thống kê và metadata</li>
            </ul>
          </div>

          <div className="build-actions">
            <button 
              className="build-button normal"
              onClick={() => buildIndex(false)}
              disabled={building}
            >
              {building ? '🔄 Đang build...' : '🏗️ Build Index'}
            </button>
            
            <button 
              className="build-button force"
              onClick={() => buildIndex(true)}
              disabled={building}
            >
              {building ? '🔄 Đang build...' : '⚡ Force Rebuild'}
            </button>
          </div>

          {lastBuildTime && (
            <div className="last-build">
              <span>Lần build cuối: {new Date(lastBuildTime).toLocaleString('vi-VN')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="message error">
          <span className="message-icon">❌</span>
          <span className="message-text">{error}</span>
          <button 
            className="message-close"
            onClick={() => setError('')}
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="message success">
          <span className="message-icon">✅</span>
          <span className="message-text">{success}</span>
          <button 
            className="message-close"
            onClick={() => setSuccess('')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Help Card */}
      <div className="help-card">
        <h3>❓ Hướng dẫn</h3>
        <div className="help-content">
          <p><strong>Build Index:</strong> Xây dựng index lần đầu hoặc cập nhật khi có sản phẩm mới</p>
          <p><strong>Force Rebuild:</strong> Xóa index cũ và xây dựng lại hoàn toàn</p>
          <p><strong>Lưu ý:</strong> Quá trình build có thể mất vài phút tùy vào số lượng sản phẩm</p>
        </div>
      </div>
    </div>
  );
};

export default FashionCLIPManagement;
