const SettingsPage = ({
  wsUrl,
  setWsUrl,
  isConnected,
  connectWebSocket,
  disconnectWebSocket
}) => {
  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>连接设置</h1>
          <p>配置 WebSocket 服务地址，并在这里手动建立或断开连接。</p>
        </div>
      </div>

      <div className="settings-card">
        <h3>WebSocket 服务配置</h3>

        <div className="form-group">
          <label htmlFor="wsUrl">服务地址</label>
          <input
            id="wsUrl"
            type="text"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            placeholder="例如：ws://localhost:18790"
            className="form-input"
            disabled={isConnected}
          />
        </div>

        <div className="settings-actions">
          <button
            onClick={connectWebSocket}
            disabled={isConnected}
            className="btn connect-btn"
          >
            建立连接
          </button>
          <button
            onClick={disconnectWebSocket}
            disabled={!isConnected}
            className="btn disconnect-btn"
          >
            断开连接
          </button>
        </div>

        <div className="connection-status">
          <span className="status-label">当前状态：</span>
          <span className={`status-value ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      <div className="settings-card tips-card">
        <h3>使用提示</h3>
        <ul>
          <li>请确认输入的是可访问的 WebSocket 地址。</li>
          <li>连接成功后，可以在消息中心即时收发消息。</li>
          <li>断开连接后，当前页面将无法继续发送新消息。</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
