import { useState, useRef, useEffect } from 'react';

const ChatPage = ({ isConnected, sendMessage, messages, inputMessage, setInputMessage }) => {
  const messagesEndRef = useRef(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-page">
      <h1>消息中心</h1>
      
      {/* 消息展示区域 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-message">
            {isConnected ? '暂无消息，开始发送第一条消息吧～' : '未连接到服务器，请先在设置页建立连接'}
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message ${msg.type}`}>
              <span className="time">{msg.time}</span>
              <span className="content">{msg.content}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 消息发送区域 */}
      <div className="send-panel">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isConnected ? '请输入消息内容...(按Enter发送)' : '未连接，无法发送消息'}
          className="message-input"
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
        />
        <button 
          onClick={sendMessage} 
          disabled={!isConnected}
          className="btn send-btn"
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatPage;