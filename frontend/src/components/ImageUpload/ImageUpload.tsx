import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ImageUpload.css';

interface ImageUploadProps {
  onUploadSuccess?: (imageUrl: string) => void;
  onUploadMultipleSuccess?: (imageUrls: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  folder?: string;
  className?: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  data: {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
  };
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadSuccess,
  onUploadMultipleSuccess,
  multiple = false,
  maxFiles = 5,
  folder = "products",
  className = ""
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadResult['data'][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Kiểm tra số lượng file
    if (files.length > maxFiles) {
      alert(`Tối đa ${maxFiles} ảnh`);
      return;
    }

    // Kiểm tra loại file
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} không phải là ảnh`);
        return false;
      }
      return true;
    });

    // Tạo preview
    const previews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          previews.push(e.target.result as string);
          if (previews.length === validFiles.length) {
            setPreviewImages(previews);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadImages = async (files: FileList) => {
    if (!user) {
      alert('Vui lòng đăng nhập để upload ảnh');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      
      // Thêm files vào FormData
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('folder', folder);

      const response = await fetch('http://localhost:8000/upload/images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload thất bại');
      }

      const result = await response.json();
      
      if (result.success) {
        setUploadedImages(result.data);
        
        if (multiple && onUploadMultipleSuccess) {
          onUploadMultipleSuccess(result.data.map((img: any) => img.secure_url));
        } else if (!multiple && onUploadSuccess && result.data.length > 0) {
          onUploadSuccess(result.data[0].secure_url);
        }
        
        // Clear preview sau khi upload thành công
        setPreviewImages([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra khi upload ảnh');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current?.files) {
      uploadImages(fileInputRef.current.files);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach(file => dataTransfer.items.add(file));
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } } as any);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const clearPreview = () => {
    setPreviewImages([]);
    setUploadedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`image-upload ${className}`}>
      <div 
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <div className="upload-content">
          <div className="upload-icon">📷</div>
          <h3>Upload ảnh sản phẩm</h3>
          <p>
            {multiple 
              ? `Kéo thả ảnh vào đây hoặc click để chọn (tối đa ${maxFiles} ảnh)`
              : 'Kéo thả ảnh vào đây hoặc click để chọn'
            }
          </p>
          <div className="upload-formats">
            Hỗ trợ: JPG, PNG, GIF, WebP
          </div>
        </div>
      </div>

      {previewImages.length > 0 && (
        <div className="preview-section">
          <div className="preview-header">
            <h4>Preview ảnh ({previewImages.length})</h4>
            <button 
              type="button" 
              className="btn-clear" 
              onClick={clearPreview}
            >
              Xóa tất cả
            </button>
          </div>
          
          <div className="preview-grid">
            {previewImages.map((preview, index) => (
              <div key={index} className="preview-item">
                <img src={preview} alt={`Preview ${index + 1}`} />
                <div className="preview-overlay">
                  <span>Ảnh {index + 1}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="upload-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Đang upload...' : 'Upload ảnh'}
            </button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p>Đang upload ảnh lên Cloudinary...</p>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <div className="uploaded-section">
          <h4>✅ Upload thành công ({uploadedImages.length} ảnh)</h4>
          <div className="uploaded-grid">
            {uploadedImages.map((image, index) => (
              <div key={index} className="uploaded-item">
                <img src={image.secure_url} alt={`Uploaded ${index + 1}`} />
                <div className="uploaded-info">
                  <p><strong>Size:</strong> {image.width}x{image.height}</p>
                  <p><strong>Format:</strong> {image.format.toUpperCase()}</p>
                  <p><strong>Size:</strong> {(image.bytes / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
