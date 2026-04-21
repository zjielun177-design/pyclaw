import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { to: '/', icon: '⌘', title: '控制台', desc: '总览状态', end: true },
  { to: '/chat', icon: '✦', title: '消息中心', desc: '实时对话', end: true },
  { to: '/settings', icon: '◎', title: '连接设置', desc: '服务地址' },
  { to: '/skills', icon: '◇', title: '技能管理', desc: '能力清单' },
  { to: '/tools', icon: '▣', title: '工具管理', desc: '工具配置' },
  { to: '/logs', icon: '≡', title: '消息日志', desc: '历史记录' },
  { to: '/about', icon: 'i', title: '关于', desc: '项目信息' },
];

const Sidebar = ({ isConnected, wsUrl }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="brand-kicker">Pyclaw Console</span>
        <h2>智能控制台</h2>
        <p>统一管理连接状态、消息会话与工具能力。</p>
      </div>

      <div className="connection-status-card">
        <h3>连接状态</h3>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="dot"></span>
          {isConnected ? '已连接' : '未连接'}
        </div>
        {isConnected && (
          <div className="connected-url">
            <span className="url-label">当前地址</span>
            <span className="url-text">{wsUrl}</span>
          </div>
        )}
      </div>

      <div className="sidebar-menu">
        <h3>功能导航</h3>
        <ul>
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-meta">
                  <span className="menu-text">{item.title}</span>
                  <span className="menu-desc">{item.desc}</span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <p>React WebSocket Workspace</p>
        <p className="version">v1.0.0</p>
      </div>
    </div>
  );
};

export default Sidebar;
