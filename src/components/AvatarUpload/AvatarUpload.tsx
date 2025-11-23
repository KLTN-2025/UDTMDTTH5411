import React, { useState, useRef } from 'react';
import './AvatarUpload.css';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onUpload,
  loading = false,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || loading) return;
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || loading) return;
    
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    // Kiểm tra kích thước file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    // Tạo preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    onUpload(file);
  };

  const handleClick = () => {
    if (disabled || loading) return;
    fileInputRef.current?.click();
  };

  const displayImage = preview || currentAvatar;

  return (
    <div className="avatar-upload">
      <div
        className={`avatar-upload-area ${dragActive ? 'drag-active' : ''} ${loading ? 'loading' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={disabled || loading}
        />
        
        {loading ? (
          <div className="upload-loading">
            <div className="loading-spinner"></div>
            <p>Đang upload...</p>
          </div>
        ) : displayImage ? (
          <div className="avatar-preview">
            <img src={displayImage} alt="Avatar preview" />
            <div className="upload-overlay">
              <span className="upload-icon">📷</span>
              <span className="upload-text">Thay đổi ảnh</span>
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <span className="upload-icon">📷</span>
            <p className="upload-text">Thêm ảnh đại diện</p>
            <p className="upload-hint">Kéo thả hoặc click để chọn</p>
          </div>
        )}
      </div>
      
      <div className="upload-info">
        <p className="upload-tips">
          • Định dạng: JPG, PNG, GIF<br/>
          • Kích thước tối đa: 5MB<br/>
          • Tỷ lệ khuyến nghị: 1:1
        </p>
      </div>
    </div>
  );
};

export default AvatarUpload;

