import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';
import AboutPage from './pages/AboutPage';
import HomePage from './pages/HomePage';
import SkillManagementPage from './pages/SkillManagementPage';
import ToolManagementPage from './pages/ToolManagementPage';
import { AuthProvider } from './pages/AuthContext';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './PrivateRoute';
import sessionService from './pages/SessionService';
import './App.css';
function removeControlCharacters(str) {
  return str.replace(/[\x00-\x1F\x7F\x80-\x9F]/g, '');
}

function getDefaultWsUrl() {
  if (typeof window === 'undefined') {
    return 'ws://localhost:18790';
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname || 'localhost';
  return `${wsProtocol}://${host}:18790`;
}

function normalizeWsUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return getDefaultWsUrl();
  }

  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `ws://${trimmed}`;
}

function App() {
  // 全局状态管理
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [initialSkills, setInitialSkills] = useState([]);
  const [initialTools, setInitialTools] = useState([])
  const [inputMessage, setInputMessage] = useState('');
  const [wsUrl, setWsUrl] = useState(() => getDefaultWsUrl());

  // WebSocket 连接方法
  const connectWebSocket = () => {
    if (ws) {
      ws.close();
    }

    try {
      const finalWsUrl = normalizeWsUrl(wsUrl);
      setWsUrl(finalWsUrl);
      const newWs = new WebSocket(finalWsUrl);
      // 连接成功
      newWs.onopen = () => {
        console.log('WebSocket 连接成功');
        setIsConnected(true);
        setWs(newWs);
        addMessage('系统消息：已成功连接到服务器', 'system');
      };
      // 收到消息
      newWs.onmessage = (event) => {
        const jsonString = removeControlCharacters(event.data);
        console.log(jsonString)
        const recvMsg = JSON.parse(jsonString)
        if(recvMsg.id == '1001') {
          if (recvMsg.result != null) {
            addMessage(recvMsg.result, 'received');
          }
        }
        if(recvMsg.id == '2001') {
          setInitialSkills(recvMsg.result)
        }
        if(recvMsg.id == '3001') {
          setInitialTools(recvMsg.result)
        }
      };
      // 连接关闭
      newWs.onclose = (event) => {
        console.log('WebSocket 连接关闭', event);
        setIsConnected(false);
        setWs(null);
        const reason = event.reason ? `, 原因: ${event.reason}` : '';
        addMessage(`系统消息：连接已关闭 (${event.code}${reason})`, 'system');
      };

      newWs.onerror = () => {
        console.error('WebSocket 错误');
        addMessage(`系统消息：连接出错，请确认地址 ${finalWsUrl} 可访问，且网关已启动`, 'system');
      };
      
    } catch (error) {
      console.error('创建 WebSocket 失败', error);
      addMessage(`系统消息：创建连接失败 - ${error.message}`, 'system');
    }
  };

  // 断开连接
  const disconnectWebSocket = () => {
    if (ws) {
      ws.close(1000, '客户端主动断开');
    }
  };

  // 发送消息
  const sendMessage = () => {
    if (!isConnected) {
      addMessage('系统消息：未连接到服务器，无法发送消息', 'system');
      return;
    }

    if (!inputMessage.trim()) {
      addMessage('系统消息：消息内容不能为空', 'system');
      return;
    }

    try {
      ws.send(JSON.stringify({
        id: '1001',
        jsonrpc: '2.0',
        method: 'agent.run',
        params: {
          id: sessionService.getToken(),
          agent: 'AgentLoop',
          message: inputMessage
        }
      }));
      addMessage(inputMessage, 'sent');
      setInputMessage(''); // 清空输入框
    } catch (error) {
      console.error('发送消息失败', error);
      addMessage(`系统消息：发送消息失败 - ${error.message}`, 'system');
    }
  };
  // 获取skills列表
  const getSkills = () => {
    if (!isConnected) {
      addMessage('系统消息：未连接到服务器，无法发送消息', 'system');
      return;
    }
    try {
      ws.send(JSON.stringify({
        id: '2001',
        jsonrpc: '2.0',
        method: 'system.listSkills',
        params: {
          id: sessionService.getToken(),
          agent: 'AgentLoop',
          message: ''
        }
      }));
      addMessage(inputMessage, 'sent');
      setInputMessage(''); // 清空输入框
    } catch (error) {
      console.error('发送消息失败', error);
      addMessage(`系统消息：发送消息失败 - ${error.message}`, 'system');
    }
  };
  // 获取tools列表
  const getTools = () => {
    if (!isConnected) {
      addMessage('系统消息：未连接到服务器，无法发送消息', 'system');
      return;
    }
    try {
      ws.send(JSON.stringify({
        id: '3001',
        jsonrpc: '2.0',
        method: 'agent.listTools',
        params: {
          id: sessionService.getToken(),
          agent: 'AgentLoop',
          message: ''
        }
      }));
      addMessage(inputMessage, 'sent');
      setInputMessage(''); // 清空输入框
    } catch (error) {
      console.error('发送消息失败', error);
      addMessage(`系统消息：发送消息失败 - ${error.message}`, 'system');
    }
  };
  // 添加消息
  const addMessage = (content, type) => {
    if(content == '') {
      return
    }
    const newMessage = {
      id: Date.now(),
      content,
      type, // sent:发送, received:接收, system:系统
      time: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 清空日志
  const clearLogs = () => {
    setMessages([]);
  };

  // 监听清空日志事件
  useEffect(() => {
    const handleClearLogs = () => clearLogs();
    window.addEventListener('clearLogs', handleClearLogs);
    return () => window.removeEventListener('clearLogs', handleClearLogs);
  }, []);

  // 组件卸载时关闭连接
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close(1000, '组件卸载');
      }
    };
  }, [ws]);

  return (
    <AuthProvider>
    <Router>
      <div className="app-wrapper">
        {/* 侧边栏 - 全局共享 */}
        <Sidebar
          isConnected={isConnected}
          wsUrl={wsUrl}
        />

        {/* 主内容区域 - 路由容器 */}
        <div className="main-content">
          <div className="app-container">
            <Routes>
              {/* 登录页 */}
              <Route path="/login" element={<LoginPage />} />
              {/* 控制台首页（显示智能体状态） */}
              <Route
                path="/"
                element={
                <PrivateRoute><HomePage isConnected={isConnected} /></PrivateRoute>
              }
              />
              {/* 消息中心放到 /chat */}
              <Route
                path="/chat"
                element={
                  <PrivateRoute>
                    <ChatPage
                    isConnected={isConnected}
                    sendMessage={sendMessage}
                    messages={messages}
                    inputMessage={inputMessage}
                    setInputMessage={setInputMessage}
                  />
                  </PrivateRoute>
                }
              />
              {/* 连接设置 */}
              <Route
                path="/settings"
                element={<PrivateRoute>
                  <SettingsPage
                    wsUrl={wsUrl}
                    setWsUrl={setWsUrl}
                    isConnected={isConnected}
                    connectWebSocket={connectWebSocket}
                    disconnectWebSocket={disconnectWebSocket}
                  /></PrivateRoute>
                }
              />
              <Route path="/skills" element={<PrivateRoute><SkillManagementPage getSkills={getSkills} initialSkills={initialSkills}/></PrivateRoute>} />
              <Route path="/tools" element={<PrivateRoute><ToolManagementPage getTools={getTools} initialTools={initialTools}/></PrivateRoute>} />
              {/* 消息日志 */}
              <Route
                path="/logs"
                element={<PrivateRoute><LogsPage messages={messages} /></PrivateRoute>}
              />

              {/* 关于页面 */}
              <Route
                path="/about"
                element={<AboutPage />}
              />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
    </AuthProvider>
  );
}

export default App;
