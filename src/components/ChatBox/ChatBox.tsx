import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import './ChatBox.css';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  shop_id?: string;
  product_id?: string;
}

interface ChatBoxProps {
  otherUserId: string;
  otherUserName?: string;
  shopId?: string;
  productId?: string;
  productName?: string;
  onClose?: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  otherUserId,
  otherUserName,
  shopId,
  productId,
  productName,
  onClose
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [otherUserInfo, setOtherUserInfo] = useState<{ name: string } | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages
  useEffect(() => {
    if (!user || !otherUserId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiService.getMessages(otherUserId, 100);
        setMessages(data);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Không thể tải tin nhắn');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Polling để cập nhật tin nhắn mới (mỗi 3 giây)
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [user, otherUserId]);

  // Fetch other user info
  useEffect(() => {
    if (otherUserName) {
      setOtherUserInfo({ name: otherUserName });
    } else {
      // Fetch user info if not provided
      const fetchUserInfo = async () => {
        try {
          const userData = await apiService.getUserById(otherUserId);
          const profile = userData.profile;
          let name = userData.username;
          if (profile) {
            if (profile.firstName && profile.lastName) {
              name = `${profile.firstName} ${profile.lastName}`;
            } else if (profile.shopName) {
              name = profile.shopName;
            }
          }
          setOtherUserInfo({ name });
        } catch (err) {
          setOtherUserInfo({ name: 'Người dùng' });
        }
      };
      fetchUserInfo();
    }
  }, [otherUserId, otherUserName]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const newMessage = await apiService.sendMessage({
        sender_id: user.id,
        receiver_id: otherUserId,
        content: inputMessage.trim(),
        shop_id: shopId,
        product_id: productId
      });

      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="chatbox-container">
        <div className="chatbox-error">
          Vui lòng đăng nhập để sử dụng tính năng chat
        </div>
      </div>
    );
  }

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">
        <div className="chatbox-header-info">
          <div className="chatbox-avatar">
            {otherUserInfo?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="chatbox-header-text">
            <h3>{otherUserInfo?.name || 'Người dùng'}</h3>
            {productName && (
              <p className="chatbox-product-info">Về sản phẩm: {productName}</p>
            )}
          </div>
        </div>
        {onClose && (
          <button className="chatbox-close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="chatbox-messages">
        {isLoading && messages.length === 0 ? (
          <div className="chatbox-loading">Đang tải tin nhắn...</div>
        ) : messages.length === 0 ? (
          <div className="chatbox-empty">
            <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user.id;
            return (
              <div
                key={message.id}
                className={`chatbox-message ${isOwn ? 'own' : 'other'}`}
              >
                <div className="chatbox-message-content">
                  {message.content}
                </div>
                <div className="chatbox-message-time">
                  {formatTime(message.created_at)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chatbox-error-message">
          {error}
        </div>
      )}

      <div className="chatbox-input">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn..."
          rows={1}
          disabled={isSending}
          className="chatbox-textarea"
        />
        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isSending}
          className="chatbox-send-btn"
        >
          {isSending ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;

