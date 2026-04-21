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
  return Array.from(str)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !((code >= 0 && code <= 31) || code === 127 || (code >= 128 && code <= 159));
    })
    .join('');
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
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [initialSkills, setInitialSkills] = useState([]);
  const [initialTools, setInitialTools] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [wsUrl, setWsUrl] = useState(() => getDefaultWsUrl());

  const addMessage = (content, type) => {
    if (!content) {
      return;
    }

    const newMessage = {
      id: Date.now() + Math.random(),
      content,
      type,
      time: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const connectWebSocket = () => {
    if (ws) {
      ws.close();
    }

    try {
      const finalWsUrl = normalizeWsUrl(wsUrl);
      setWsUrl(finalWsUrl);
      const newWs = new WebSocket(finalWsUrl);

      newWs.onopen = () => {
        setIsConnected(true);
        setWs(newWs);
        addMessage('系统消息：已成功连接到服务器。', 'system');
      };

      newWs.onmessage = (event) => {
        const jsonString = removeControlCharacters(event.data);
        const recvMsg = JSON.parse(jsonString);

        if (recvMsg.id === '1001' && recvMsg.result != null) {
          addMessage(recvMsg.result, 'received');
        }
        if (recvMsg.id === '2001') {
          setInitialSkills(recvMsg.result || []);
        }
        if (recvMsg.id === '3001') {
          setInitialTools(recvMsg.result || []);
        }
      };

      newWs.onclose = (event) => {
        setIsConnected(false);
        setWs(null);
        const reason = event.reason ? `，原因：${event.reason}` : '';
        addMessage(`系统消息：连接已关闭（${event.code}${reason}）。`, 'system');
      };

      newWs.onerror = () => {
        addMessage(`系统消息：连接出错，请确认地址 ${finalWsUrl} 可访问且网关已启动。`, 'system');
      };
    } catch (error) {
      addMessage(`系统消息：创建连接失败 - ${error.message}`, 'system');
    }
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close(1000, '客户端主动断开');
    }
  };

  const sendMessage = () => {
    if (!isConnected || !ws) {
      addMessage('系统消息：当前未连接到服务器，无法发送消息。', 'system');
      return;
    }

    if (!inputMessage.trim()) {
      addMessage('系统消息：消息内容不能为空。', 'system');
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
      setInputMessage('');
    } catch (error) {
      addMessage(`系统消息：发送消息失败 - ${error.message}`, 'system');
    }
  };

  const getSkills = () => {
    if (!isConnected || !ws) {
      addMessage('系统消息：当前未连接到服务器，无法获取技能列表。', 'system');
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
    } catch (error) {
      addMessage(`系统消息：获取技能列表失败 - ${error.message}`, 'system');
    }
  };

  const getTools = () => {
    if (!isConnected || !ws) {
      addMessage('系统消息：当前未连接到服务器，无法获取工具列表。', 'system');
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
    } catch (error) {
      addMessage(`系统消息：获取工具列表失败 - ${error.message}`, 'system');
    }
  };

  const clearLogs = () => {
    setMessages([]);
  };

  useEffect(() => {
    const handleClearLogs = () => clearLogs();
    window.addEventListener('clearLogs', handleClearLogs);
    return () => window.removeEventListener('clearLogs', handleClearLogs);
  }, []);

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
          <Sidebar
            isConnected={isConnected}
            wsUrl={wsUrl}
          />

          <div className="main-content">
            <div className="app-container">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={<PrivateRoute><HomePage isConnected={isConnected} /></PrivateRoute>}
                />
                <Route
                  path="/chat"
                  element={(
                    <PrivateRoute>
                      <ChatPage
                        isConnected={isConnected}
                        sendMessage={sendMessage}
                        messages={messages}
                        inputMessage={inputMessage}
                        setInputMessage={setInputMessage}
                      />
                    </PrivateRoute>
                  )}
                />
                <Route
                  path="/settings"
                  element={(
                    <PrivateRoute>
                      <SettingsPage
                        wsUrl={wsUrl}
                        setWsUrl={setWsUrl}
                        isConnected={isConnected}
                        connectWebSocket={connectWebSocket}
                        disconnectWebSocket={disconnectWebSocket}
                      />
                    </PrivateRoute>
                  )}
                />
                <Route
                  path="/skills"
                  element={<PrivateRoute><SkillManagementPage getSkills={getSkills} initialSkills={initialSkills} /></PrivateRoute>}
                />
                <Route
                  path="/tools"
                  element={<PrivateRoute><ToolManagementPage getTools={getTools} initialTools={initialTools} /></PrivateRoute>}
                />
                <Route
                  path="/logs"
                  element={<PrivateRoute><LogsPage messages={messages} /></PrivateRoute>}
                />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
