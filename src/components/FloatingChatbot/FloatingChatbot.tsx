import React, { useState } from 'react';
import './FloatingChatbot.css';
import Chatbot from '../Chatbot/Chatbot';

interface FloatingChatbotProps {
  productContext?: {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
  };
}

const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ productContext }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Button */}
      <div className="floating-chatbot-button" onClick={toggleChatbot}>
        <div className="chatbot-icon">
          {isOpen ? '✕' : '💬'}
        </div>
        <div className="chatbot-tooltip">
          {isOpen ? 'Đóng chat' : 'Chat với AI'}
        </div>
      </div>

      {/* Chatbot Modal */}
      <Chatbot 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        productContext={productContext}
      />
    </>
  );
};

export default FloatingChatbot;
