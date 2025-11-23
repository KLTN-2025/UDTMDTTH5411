import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import './BiduAssistant.css';

type TabType = 'cskh' | 'search';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface BiduAssistantProps {
  productContext?: {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
  };
}

// Function để parse markdown text thành React elements
const parseMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [''];
  
  const parts: React.ReactNode[] = [];
  let keyCounter = 0;
  
  // Tách text theo newlines trước
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      parts.push(<br key={`br-${keyCounter++}`} />);
    }
    
    if (!line) {
      return;
    }
    
    // Tìm tất cả bold matches
    const boldMatches: Array<{ start: number; end: number; content: string }> = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match: RegExpExecArray | null;
    
    while ((match = boldRegex.exec(line)) !== null) {
      boldMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1]
      });
    }
    
    // Tìm italic matches (tránh overlap với bold)
    const italicMatches: Array<{ start: number; end: number; content: string }> = [];
    const italicRegex = /\*([^*]+?)\*/g;
    
    while ((match = italicRegex.exec(line)) !== null) {
      // Kiểm tra xem có nằm trong bold không
      const isInBold = boldMatches.some(b => 
        match!.index >= b.start && match!.index < b.end
      );
      
      if (!isInBold) {
        italicMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1]
        });
      }
    }
    
    // Gộp tất cả matches và sắp xếp
    const allMatches = [
      ...boldMatches.map(m => ({ ...m, type: 'bold' as const })),
      ...italicMatches.map(m => ({ ...m, type: 'italic' as const }))
    ].sort((a, b) => a.start - b.start);
    
    // Build parts cho line này
    let lastIndex = 0;
    
    allMatches.forEach((match) => {
      // Text trước match
      if (match.start > lastIndex) {
        const beforeText = line.substring(lastIndex, match.start);
        if (beforeText) {
          parts.push(beforeText);
        }
      }
      
      // Formatted content
      if (match.type === 'bold') {
        parts.push(<strong key={`bold-${keyCounter++}`}>{match.content}</strong>);
      } else if (match.type === 'italic') {
        parts.push(<em key={`italic-${keyCounter++}`}>{match.content}</em>);
      }
      
      lastIndex = match.end;
    });
    
    // Text còn lại
    if (lastIndex < line.length) {
      const remainingText = line.substring(lastIndex);
      if (remainingText) {
        parts.push(remainingText);
      }
    }
  });
  
  return parts.length > 0 ? parts : [text];
};

const BiduAssistant: React.FC<BiduAssistantProps> = ({ productContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('cskh');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Tạo conversation ID khi mở chatbot
  useEffect(() => {
    if (isOpen && !conversationId && activeTab === 'cskh') {
      setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
      // Thêm tin nhắn chào mừng
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        text: "Chào Bạn! Mình là trợ lý AI nè. Bạn muốn mình giúp gì nào?",
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, conversationId, activeTab]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleAssistant = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setError('');
      setSelectedFile(null);
      setPreviewUrl('');
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'cskh') {
      setSelectedFile(null);
      setPreviewUrl('');
      setError('');
    }
  };

  // Chatbot functions
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      text: inputMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_id: conversationId,
          product_context: productContext
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        text: data.message,
        isUser: false,
        timestamp: data.timestamp
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        text: "Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === 'cskh') {
        sendMessage();
      }
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  // Image search functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleImageSearch = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn một hình ảnh');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const results = await apiService.searchSimilarProducts(selectedFile);
      
      navigate('/image-search-results', { 
        state: { 
          results, 
          queryImage: previewUrl,
          queryFileName: selectedFile.name 
        } 
      });

      setIsOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error searching similar products:', err);
      
      let errorMessage = 'Không thể tìm kiếm sản phẩm tương tự. Vui lòng thử lại.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('detail' in err) {
          errorMessage = String(err.detail);
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuickAction = async (action: string) => {
    if (activeTab === 'cskh') {
      let message = '';
      switch (action) {
        case 'search':
          message = 'Tôi muốn tìm kiếm sản phẩm';
          break;
        case 'discount':
          message = 'Tôi muốn xem mã giảm giá';
          break;
        case 'return':
          message = 'Tôi muốn biết hướng dẫn đổi trả hàng';
          break;
        case 'virtual':
          message = 'Tôi muốn thử đồ ảo';
          break;
        default:
          return;
      }
      
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        text: message,
        isUser: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chatbot/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            conversation_id: conversationId,
            product_context: productContext
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();
        
        const botMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          text: data.message,
          isUser: false,
          timestamp: data.timestamp
        };

        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          text: "Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    } else if (action === 'search') {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="bidu-floating-button" onClick={toggleAssistant}>
        <div className="bidu-robot-icon">
          {isOpen ? '✕' : '🤖'}
        </div>
        <div className="bidu-tooltip">
          {isOpen ? 'Đóng' : 'AI Assistant'}
        </div>
      </div>

      {/* Assistant Modal */}
      {isOpen && (
        <div className="bidu-overlay" onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
          <div className="bidu-container">
            {/* Header */}
            <div className="bidu-header">
              <button className="bidu-back-btn" onClick={() => setIsOpen(false)}>
                ←
              </button>
              <div className="bidu-header-info">
                <div className="bidu-avatar-small">
                  <div className="bidu-robot-face">🤖</div>
                </div>
                <div className="bidu-header-text">
                  <h3>AI Assistant</h3>
                  <p>Trợ lý thông minh</p>
                </div>
              </div>
              <button className="bidu-close-btn" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="bidu-tabs">
              <button 
                className={`bidu-tab ${activeTab === 'cskh' ? 'active' : ''}`}
                onClick={() => handleTabChange('cskh')}
              >
                CSKH
              </button>
              <button 
                className={`bidu-tab ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => handleTabChange('search')}
              >
                Tìm kiếm sản phẩm
              </button>
            </div>

            {/* Content Area */}
            <div className="bidu-content">
              {activeTab === 'cskh' ? (
                <>
                  {/* Robot Character */}
                  <div className="bidu-robot-character">
                    <div className="bidu-robot-3d">
                      <div className="bidu-robot-head">
                        <div className="bidu-robot-eyes">
                          <div className="bidu-eye"></div>
                          <div className="bidu-eye"></div>
                        </div>
                        <div className="bidu-robot-mouth"></div>
                      </div>
                    </div>
                  </div>

                  {/* Welcome Message */}
                  <div className="bidu-welcome">
                    <h2>Chào Bạn</h2>
                    <p>Mình là trợ lý AI nè.</p>
                    <p>Bạn muốn mình giúp gì nào?</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="bidu-quick-actions">
                    <p className="bidu-actions-label">Chọn tính năng muốn hỗ trợ</p>
                    <div className="bidu-actions-grid">
                      <button 
                        className="bidu-action-btn"
                        onClick={() => handleQuickAction('search')}
                      >
                        <span className="bidu-action-icon">🔍</span>
                        <span>Tìm kiếm sản phẩm</span>
                      </button>
                      <button 
                        className="bidu-action-btn"
                        onClick={() => handleQuickAction('discount')}
                      >
                        <span className="bidu-action-icon">🎁</span>
                        <span>Mã giảm giá</span>
                      </button>
                      <button 
                        className="bidu-action-btn"
                        onClick={() => handleQuickAction('return')}
                      >
                        <span className="bidu-action-icon">💻</span>
                        <span>Hướng dẫn đổi trả</span>
                      </button>
                      <button 
                        className="bidu-action-btn"
                        onClick={() => handleQuickAction('virtual')}
                      >
                        <span className="bidu-action-icon">🎀</span>
                        <span>Thử đồ ảo</span>
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  {messages.length > 1 && (
                    <div className="bidu-messages">
                      {messages.slice(1).map((message) => (
                        <div
                          key={message.id}
                          className={`bidu-message ${message.isUser ? 'user' : 'bot'}`}
                        >
                          <div className="bidu-message-content">
                            {parseMarkdown(message.text)}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="bidu-message bot">
                          <div className="bidu-message-content">
                            <div className="bidu-typing">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </>
              ) : (
                <div className="bidu-image-search-content">
                  {!selectedFile ? (
                    <div className="bidu-upload-area" onClick={() => fileInputRef.current?.click()}>
                      <div className="bidu-upload-icon">📁</div>
                      <p>Kéo thả hình ảnh vào đây hoặc</p>
                      <button 
                        className="bidu-select-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Chọn file
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <p className="bidu-upload-hint">
                        Hỗ trợ: JPG, PNG, GIF (tối đa 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="bidu-image-preview-container">
                      <div className="bidu-image-preview">
                        <img src={previewUrl} alt="Preview" />
                        <div className="bidu-image-info">
                          <p className="bidu-file-name">{selectedFile.name}</p>
                          <p className="bidu-file-size">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <div className="bidu-preview-actions">
                        <button 
                          className="bidu-change-image-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Đổi ảnh
                        </button>
                        <button 
                          className="bidu-clear-image-btn"
                          onClick={handleClearImage}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bidu-error">
                      ⚠️ {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="bidu-input-area">
              {activeTab === 'cskh' ? (
                <div className="bidu-chat-input">
                  <button className="bidu-attach-btn">+</button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập nội dung"
                    disabled={isLoading}
                    className="bidu-text-input"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bidu-send-btn"
                  >
                    ✈️
                  </button>
                </div>
              ) : (
                <div className="bidu-search-actions">
                  <button 
                    className="bidu-cancel-btn"
                    onClick={() => setIsOpen(false)}
                  >
                    Hủy
                  </button>
                  <button 
                    className="bidu-search-btn"
                    onClick={handleImageSearch}
                    disabled={!selectedFile || isSearching}
                  >
                    {isSearching ? (
                      <>
                        <span className="bidu-spinner"></span>
                        Đang tìm kiếm...
                      </>
                    ) : (
                      <>
                        🔍 Tìm kiếm
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BiduAssistant;

