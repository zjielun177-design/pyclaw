import { useRef, useEffect } from 'react';

const ChatPage = ({ isConnected, sendMessage, messages, inputMessage, setInputMessage }) => {
  const messagesEndRef = useRef(null);

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
      <div className="page-header">
        <div>
          <h1>消息中心</h1>
          <p>在这里和智能体进行实时对话，所有消息会同步显示在日志页。</p>
        </div>
      </div>

      <div className="chat-topbar">
        <div className={`chat-status-pill ${isConnected ? 'online' : ''}`}>
          {isConnected ? '网关已连接，可以直接发送消息' : '当前未连接，请先前往连接设置'}
        </div>
      </div>

      <div className="messages-shell">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-message">
              {isConnected ? '暂无消息，开始发送第一条内容吧。' : '还没有连接到服务，请先前往设置页建立连接。'}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.type}`}>
                <span className="time">{msg.time}</span>
                <span className="content">{msg.content}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="send-panel">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isConnected ? '输入消息后按 Enter 发送，Shift + Enter 换行' : '当前未连接，暂时无法发送消息'}
            className="message-input"
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected}
            className="btn send-btn"
          >
            发送消息
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
