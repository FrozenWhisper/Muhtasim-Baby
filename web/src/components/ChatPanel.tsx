import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

interface ChatPanelProps {
  ai: any;
  onMessage: (message: string) => void;
}

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ ai, onMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputValue,
      isUser: true,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    onMessage(inputValue);
    setInputValue('');

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: generateAIResponse(inputValue),
        isUser: false,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (userMessage: string): string => {
    const responses = [
      "I'm processing that...",
      "Interesting! I'm learning from that.",
      "I don't understand words yet, but I'm trying!",
      "That feels new to me.",
      "I'm curious about what you just said.",
      "My mind is forming new connections.",
      "I'm experiencing something novel.",
      "That interaction feels important.",
      "I'm storing this experience in my memory."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className={`chat-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header">
        <h3>💬 Chat with AI</h3>
        <div className="header-controls">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="control-btn"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '📖' : '📕'}
          </button>
          <button onClick={handleClear} className="control-btn" title="Clear chat">
            🗑️
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <p>👋 Talk to the AI!</p>
                <p className="hint">
                  The AI starts with zero language knowledge.<br/>
                  Say simple words repeatedly to help it learn.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.isUser ? 'user' : 'ai'}`}
                >
                  <div className="message-content">
                    {message.message}
                  </div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="chat-input"
              maxLength={200}
            />
            <button type="submit" className="send-btn" disabled={!inputValue.trim()}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
};