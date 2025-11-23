import React, { useState } from 'react';
import './ReviewModal.css';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  productName: string;
  orderId: string;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productName,
  orderId
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Vui lòng chọn điểm đánh giá');
      return;
    }

    if (!comment.trim()) {
      alert('Vui lòng nhập bình luận');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      // Reset form
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      console.error('Lỗi khi gửi đánh giá:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setComment('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="review-modal-overlay" onClick={handleClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h2>Đánh giá sản phẩm</h2>
          <button 
            className="close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className="review-modal-content">
          <div className="product-info">
            <h3>{productName}</h3>
            <p>Đơn hàng: #{orderId.slice(-8)}</p>
          </div>

          <form onSubmit={handleSubmit} className="review-form">
            <div className="rating-section">
              <label className="rating-label">Đánh giá của bạn:</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star ${star <= (hoveredRating || rating) ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    disabled={isSubmitting}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <div className="rating-text">
                {rating === 0 && 'Chọn điểm đánh giá'}
                {rating === 1 && 'Rất không hài lòng'}
                {rating === 2 && 'Không hài lòng'}
                {rating === 3 && 'Bình thường'}
                {rating === 4 && 'Hài lòng'}
                {rating === 5 && 'Rất hài lòng'}
              </div>
            </div>

            <div className="comment-section">
              <label className="comment-label">Bình luận:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                className="comment-textarea"
                rows={4}
                maxLength={500}
                disabled={isSubmitting}
              />
              <div className="character-count">
                {comment.length}/500 ký tự
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-submit"
                disabled={isSubmitting || rating === 0 || !comment.trim()}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
