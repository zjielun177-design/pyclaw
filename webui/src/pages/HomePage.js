import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

const quickEntries = [
  { to: '/chat', icon: '✦', title: '消息中心', desc: '开始新一轮对话' },
  { to: '/tools', icon: '▣', title: '工具管理', desc: '查看工具定义与配置' },
  { to: '/skills', icon: '◇', title: '技能管理', desc: '整理可用技能清单' },
  { to: '/settings', icon: '◎', title: '连接设置', desc: '调整 WebSocket 地址' },
];

const HomePage = ({ isConnected }) => {
  const { user, logout, refreshSession } = useAuth();

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="hero-panel">
          <span className="hero-kicker">Workspace Overview</span>
          <h1>欢迎回来，{user?.username || '用户'}</h1>
          <p>这里是你的前端控制台。你可以快速查看连接状态、进入会话、管理工具和技能。</p>
          <div className="page-actions" style={{ marginTop: '20px' }}>
            <button onClick={refreshSession} className="btn confirm-btn">
              刷新会话
            </button>
            <button onClick={logout} className="btn disconnect-btn">
              安全退出
            </button>
          </div>
          <div className="hero-meta">
            <div className="hero-stat">
              <strong>{isConnected ? '在线' : '离线'}</strong>
              <span>当前网关连接状态</span>
            </div>
            <div className="hero-stat">
              <strong>实时</strong>
              <span>消息与日志同步更新</span>
            </div>
            <div className="hero-stat">
              <strong>统一</strong>
              <span>技能、工具、连接集中管理</span>
            </div>
          </div>
        </div>

        <div className="agent-status-card">
          <div className="card-title">
            <h2>智能体运行状态</h2>
          </div>
          <div className="agent-status">
            <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {isConnected ? '已连接，服务运行中' : '未连接，等待建立连接'}
              </span>
            </div>
          </div>
          <div className="agent-info">
            <div className="info-item">
              <label>连接状态</label>
              <span className={isConnected ? 'text-success' : 'text-danger'}>
                {isConnected ? '正常' : '断开'}
              </span>
            </div>
            <div className="info-item">
              <label>服务类型</label>
              <span>WebSocket Agent</span>
            </div>
            <div className="info-item">
              <label>运行模式</label>
              <span>客户端控制台</span>
            </div>
            <div className="info-item">
              <label>当前版本</label>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="quick-entry">
        <h3>快捷入口</h3>
        <div className="entry-grid">
          {quickEntries.map((entry) => (
            <Link key={entry.to} to={entry.to} className="entry-item">
              <div className="icon">{entry.icon}</div>
              <p>{entry.title}</p>
              <small>{entry.desc}</small>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
