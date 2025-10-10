import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProductManagement from '../../components/ProductManagement/ProductManagement';
import ShopManagement from '../../components/ShopManagement/ShopManagement';
import UserManagement from '../../components/UserManagement/UserManagement';
import './AdminPanel.css';

type TabType = 'products' | 'shops' | 'users';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('products');

  if (user?.role !== 'admin') {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>Không có quyền truy cập</h2>
          <p>Chỉ admin mới có thể truy cập trang này.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'products' as TabType, label: 'Quản lý sản phẩm', icon: '📦' },
    { id: 'shops' as TabType, label: 'Quản lý cửa hàng', icon: '🏪' },
    { id: 'users' as TabType, label: 'Quản lý người dùng', icon: '👥' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductManagement />;
      case 'shops':
        return <ShopManagement />;
      case 'users':
        return <UserManagement />;
      default:
        return <ProductManagement />;
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h1>Admin Panel</h1>
        <p>Quản lý hệ thống và nội dung</p>
      </div>

      <div className="admin-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-panel-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminPanel;

