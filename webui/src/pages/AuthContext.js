import React, { createContext, useContext, useState, useEffect } from 'react';
import sessionService from './SessionService';

// 创建上下文
const AuthContext = createContext();

// 自定义Hook，方便组件使用
export const useAuth = () => {
  return useContext(AuthContext);
};

// 上下文提供者组件
export const AuthProvider = ({ children }) => {
  // 登录状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // 用户信息
  const [user, setUser] = useState(null);
  // 加载状态
  const [loading, setLoading] = useState(true);

  // 初始化检查登录状态
  useEffect(() => {
    const initAuth = () => {
      try {
        const isAuth = sessionService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          setUser(sessionService.getUserInfo());
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    
    // 定时检查Session是否过期（每分钟检查一次）
    const interval = setInterval(() => {
      const currentAuth = sessionService.isAuthenticated();
      if (currentAuth !== isAuthenticated) {
        setIsAuthenticated(currentAuth);
        setUser(currentAuth ? sessionService.getUserInfo() : null);
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // 登录方法
  const login = async (username, password) => {
    // 模拟登录API请求（替换为真实接口）
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === 'admin' && password === '123456') {
          const userInfo = { id: 1, username, role: 'admin' };
          const token = 'fake-jwt-token-' + Date.now();
          
          // 创建Session
          sessionService.setSession(userInfo, token);
          
          // 更新状态
          setIsAuthenticated(true);
          setUser(userInfo);
          
          resolve({ success: true, userInfo, token });
        } else {
          reject(new Error('用户名或密码错误'));
        }
      }, 1000);
    });
  };

  // 登出方法
  const logout = () => {
    // 清除Session
    sessionService.clearSession();
    // 更新状态
    setIsAuthenticated(false);
    setUser(null);
    // 跳转到登录页
    window.location.href = '/login';
  };

  // 刷新Session
  const refreshSession = () => {
    sessionService.refreshSession();
  };

  // 上下文值
  const authValue = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    refreshSession
  };

  return (
    <AuthContext.Provider value={authValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};