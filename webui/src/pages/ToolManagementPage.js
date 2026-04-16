import { useState, useEffect, useRef } from 'react';

// 模拟工具分类数据
const toolCategories = [
  { id: 'websocket', name: 'WebSocket 工具' },
  { id: 'message', name: '消息处理工具' },
  { id: 'system', name: '系统工具' },
  { id: 'custom', name: '自定义工具' }
];

// 模拟初始工具数据
const initialTools = [
  {
    id: 1,
    name: 'WebSocket 调试器',
    category: 'websocket',
    version: '1.2.0',
    status: 'active', // active:启用, inactive:禁用
    description: '用于调试 WebSocket 连接、监控消息收发、模拟异常场景',
    config: {
      autoReconnect: true,
      reconnectInterval: 3000,
      logLevel: 'info'
    },
    createTime: '2026-03-01 10:00:00',
    updateTime: '2026-03-15 14:20:00',
    author: '系统内置'
  },
  {
    id: 2,
    name: '消息格式化工具',
    category: 'message',
    version: '1.0.5',
    status: 'active',
    description: '将收到的原始消息格式化为 JSON/XML/文本等格式',
    config: {
      formatType: 'json',
      prettyPrint: true,
      autoEscape: false
    },
    createTime: '2026-03-05 09:15:00',
    updateTime: '2026-03-05 09:15:00',
    author: '系统内置'
  },
  {
    id: 3,
    name: '性能监控工具',
    category: 'system',
    version: '2.1.0',
    status: 'inactive',
    description: '监控系统资源使用情况、WebSocket 连接性能指标',
    config: {
      monitorInterval: 5000,
      alertThreshold: 80,
      saveLogs: true
    },
    createTime: '2026-03-10 16:30:00',
    updateTime: '2026-03-12 11:45:00',
    author: '自定义'
  }
];

const ToolManagementPage = ({getTools, initialTools}) => {
  // 核心状态
  const [tools, setTools] = useState(initialTools);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  // 用 useRef 定义标记位，ref 的值不会因组件重渲染重置
  const isInitialized = useRef(false);
  // 页面加载时仅执行一次的逻辑
  useEffect(() => {
    // 仅在首次真正挂载时执行核心逻辑
    if (!isInitialized.current) {
      const fetchInitialData = async () => {
        try {
          getTools();
          // 执行后标记为已初始化
          isInitialized.current = true;
        } catch (error) {
          console.error('数据加载失败：', error);
        }
      };

      fetchInitialData();
    }

    // 清理函数（可选，避免内存泄漏）
    return () => {
      // 注意：开发环境下这个清理函数会先执行一次，生产环境只执行一次
      console.log('组件卸载/重新挂载前的清理');
    };
  }, []); // 空依赖保持不变

  useEffect(() => {   
    setTools(initialTools);
  });
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    category: toolCategories[0].id,
    version: '1.0.0',
    description: '',
    author: '自定义',
    config: {}
  });
  
  const modalRef = useRef(null);
  const configModalRef = useRef(null);

  // 筛选工具列表
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchText.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchText.toLowerCase()) ||
                          tool.version.includes(searchText);
    const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || tool.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // 打开新增工具弹窗
  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({
      name: '',
      category: toolCategories[0].id,
      version: '1.0.0',
      description: '',
      author: '自定义',
      config: {}
    });
    setModalVisible(true);
  };

  // 打开编辑工具弹窗
  const openEditModal = (tool) => {
    setIsEditMode(true);
    setCurrentTool(tool);
    setFormData({
      name: tool.name,
      category: tool.category,
      version: tool.version,
      description: tool.description,
      author: tool.author,
      config: { ...tool.config }
    });
    setModalVisible(true);
  };

  // 打开配置编辑弹窗
  const openConfigModal = (tool) => {
    setCurrentTool(tool);
    setFormData({
      ...formData,
      config: { ...tool.config }
    });
    setConfigModalVisible(true);
  };

  // 关闭弹窗
  const closeModal = () => {
    setModalVisible(false);
    setCurrentTool(null);
  };

  const closeConfigModal = () => {
    setConfigModalVisible(false);
    setCurrentTool(null);
  };

  // 处理工具表单提交
  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('工具名称不能为空');
      return;
    }

    const now = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-');

    if (isEditMode) {
      // 编辑模式
      setTools(tools.map(tool => 
        tool.id === currentTool.id 
          ? { 
              ...tool, 
              ...formData,
              updateTime: now
            } 
          : tool
      ));
    } else {
      // 新增模式
      const newTool = {
        id: Date.now(),
        ...formData,
        status: 'inactive',
        createTime: now,
        updateTime: now,
        config: formData.config || {}
      };
      setTools([...tools, newTool]);
    }

    closeModal();
  };

  // 保存工具配置
  const saveConfig = () => {
    setTools(tools.map(tool => 
      tool.id === currentTool.id 
        ? { 
            ...tool, 
            config: { ...formData.config },
            updateTime: new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).replace(/\//g, '-')
          } 
        : tool
    ));
    closeConfigModal();
  };

  // 切换工具状态
  const toggleToolStatus = (id) => {
    setTools(tools.map(tool => 
      tool.id === id 
        ? { 
            ...tool, 
            status: tool.status === 'active' ? 'inactive' : 'active',
            updateTime: new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).replace(/\//g, '-')
          } 
        : tool
    ));
  };

  // 删除工具
  const deleteTool = (id) => {
    if (window.confirm('确定要删除该工具吗？此操作不可恢复！')) {
      setTools(tools.filter(tool => tool.id !== id));
    }
  };

  // 点击弹窗外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
      if (configModalRef.current && !configModalRef.current.contains(e.target)) {
        closeConfigModal();
      }
    };

    if (modalVisible || configModalVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalVisible, configModalVisible]);

  return (
    <div className="tool-management-page">
      {/* 页面头部 */}
      <div className="page-header">
        <h1>工具管理</h1>
        <button onClick={openAddModal} className="btn add-btn">
          <span className="icon">+</span> 新增工具
        </button>
      </div>

      {/* 筛选和搜索区域 */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索工具名称/版本/描述..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="category-filter">
          <label>分类筛选：</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">全部分类</option>
            {toolCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="status-filter">
          <label>状态筛选：</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">已启用</option>
            <option value="inactive">已禁用</option>
          </select>
        </div>
      </div>

      {/* 工具列表 */}
      <div className="tools-list">
        {filteredTools.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔧</div>
            <div className="empty-text">暂无工具数据</div>
            <button onClick={openAddModal} className="btn empty-add-btn">
              立即创建第一个工具
            </button>
          </div>
        ) : (
          <div className="tools-grid">
            {filteredTools.map(tool => {
              const categoryName = toolCategories.find(c => c.id === tool.category)?.name || '未分类';
              return (
                <div key={tool.id} className="tool-card">
                  <div className="card-header">
                    <div className="tool-name">{tool.name}</div>
                    <span className={`status-tag ${tool.status}`}>
                      {tool.status === 'active' ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <div className="tool-meta">
                      <div className="meta-item">
                        <span className="label">分类：</span>
                        <span className="value">{categoryName}</span>
                      </div>
                      <div className="meta-item">
                        <span className="label">版本：</span>
                        <span className="value version">{tool.version}</span>
                      </div>
                      <div className="meta-item">
                        <span className="label">作者：</span>
                        <span className="value">{tool.author}</span>
                      </div>
                      <div className="meta-item full-width">
                        <span className="label">描述：</span>
                        <span className="value">{tool.description}</span>
                      </div>
                      <div className="meta-item full-width">
                        <span className="label">更新时间：</span>
                        <span className="value time">{tool.updateTime}</span>
                      </div>
                    </div>
                    
                    <div className="config-preview">
                      <div className="config-label">配置项：</div>
                      <div className="config-content">
                        {Object.keys(tool.config).length === 0 ? (
                          <span className="no-config">暂无配置</span>
                        ) : (
                          <pre>{JSON.stringify(tool.config, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-footer">
                    <button 
                      onClick={() => toggleToolStatus(tool.id)}
                      className={`action-btn status-btn ${tool.status}`}
                    >
                      {tool.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button 
                      onClick={() => openConfigModal(tool)}
                      className="action-btn config-btn"
                    >
                      配置
                    </button>
                    <button 
                      onClick={() => openEditModal(tool)}
                      className="action-btn edit-btn"
                    >
                      编辑
                    </button>
                    <button 
                      onClick={() => deleteTool(tool.id)}
                      className="action-btn delete-btn"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新增/编辑工具弹窗 */}
      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <h2>{isEditMode ? '编辑工具' : '新增工具'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>工具名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="请输入工具名称"
                  />
                </div>
                <div className="form-group">
                  <label>工具版本 *</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                    placeholder="例如：1.0.0"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>工具分类 *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {toolCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>作者</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    placeholder="请输入作者名称"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>工具描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="请输入工具详细描述"
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeModal} className="btn cancel-btn">取消</button>
              <button onClick={handleSubmit} className="btn confirm-btn">
                {isEditMode ? '保存修改' : '创建工具'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置编辑弹窗 */}
      {configModalVisible && currentTool && (
        <div className="modal-overlay">
          <div className="modal-content config-modal" ref={configModalRef}>
            <div className="modal-header">
              <h2>配置工具：{currentTool.name}</h2>
              <button onClick={closeConfigModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>工具配置 JSON</label>
                <div className="config-editor">
                  <textarea
                    value={JSON.stringify(formData.config, null, 2)}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        setFormData({...formData, config});
                      } catch (e) {
                        // 保留错误输入，让用户自行修正
                      }
                    }}
                    placeholder='{"key": "value"}'
                    rows={10}
                  />
                </div>
                <div className="config-tip">
                  请输入有效的 JSON 格式配置，配置将实时生效
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeConfigModal} className="btn cancel-btn">取消</button>
              <button 
                onClick={saveConfig}
                className="btn confirm-btn"
                disabled={!formData.config || typeof formData.config !== 'object'}
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolManagementPage;