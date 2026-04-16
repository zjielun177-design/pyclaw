import { useState, useEffect, useRef } from 'react';

// 模拟初始技能数据
// const initialSkills = [
//   {
//     id: 1,
//     name: '自动回复',
//     code: 'AUTO_REPLY',
//     description: '收到指定关键词后自动回复预设内容',
//     status: 'active', // active:启用, inactive:禁用
//     createTime: '2026-03-01 14:30:00',
//     updateTime: '2026-03-10 09:15:00'
//   },
//   {
//     id: 2,
//     name: '消息转发',
//     code: 'MSG_FORWARD',
//     description: '将收到的消息转发到指定 WebSocket 地址',
//     status: 'active',
//     createTime: '2026-03-02 10:20:00',
//     updateTime: '2026-03-02 10:20:00'
//   },
//   {
//     id: 3,
//     name: '心跳检测',
//     code: 'HEARTBEAT',
//     description: '定时发送心跳包维持 WebSocket 连接',
//     status: 'inactive',
//     createTime: '2026-03-05 16:45:00',
//     updateTime: '2026-03-08 11:30:00'
//   }
// ];

const SkillManagementPage = ({getSkills,initialSkills}) => {
  // 状态管理
  const [skills, setSkills] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSkill, setCurrentSkill] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  // 用 useRef 定义标记位，ref 的值不会因组件重渲染重置
  const isInitialized = useRef(false);
  // 页面加载时仅执行一次的逻辑
  useEffect(() => {
    // 仅在首次真正挂载时执行核心逻辑
    if (!isInitialized.current) {
      const fetchInitialData = async () => {
        try {
          getSkills();
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
    setSkills(initialSkills);
  });

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  const modalRef = useRef(null);
  
  // 筛选技能列表
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchText.toLowerCase()) || 
                          skill.code.toLowerCase().includes(searchText.toLowerCase()) ||
                          skill.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || skill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  // 打开新增技能弹窗
  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ name: '', code: '', description: '' });
    setModalVisible(true);
  };

  const refresh = () => {
    getSkills();
  };

  // 打开编辑技能弹窗
  const openEditModal = (skill) => {
    setIsEditMode(true);
    setCurrentSkill(skill);
    setFormData({
      name: skill.name,
      code: skill.code,
      description: skill.description
    });
    setModalVisible(true);
  };

  // 关闭弹窗
  const closeModal = () => {
    setModalVisible(false);
    setCurrentSkill(null);
  };

  // 处理表单提交
  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('技能名称和编码不能为空');
      return;
    }

    if (isEditMode) {
      // 编辑模式
      setSkills(skills.map(skill => 
        skill.id === currentSkill.id 
          ? { 
              ...skill, 
              ...formData, 
              updateTime: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }).replace(/\//g, '-')
            } 
          : skill
      ));
    } else {
      // 新增模式
      const newSkill = {
        id: Date.now(),
        ...formData,
        status: 'inactive',
        createTime: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(/\//g, '-'),
        updateTime: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(/\//g, '-')
      };
      setSkills([...skills, newSkill]);
    }

    closeModal();
  };

  // 切换技能状态
  const toggleSkillStatus = (id) => {
    setSkills(skills.map(skill => 
      skill.id === id 
        ? { 
            ...skill, 
            status: skill.status === 'active' ? 'inactive' : 'active',
            updateTime: new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).replace(/\//g, '-')
          } 
        : skill
    ));
  };

  // 删除技能
  const deleteSkill = (id) => {
    if (window.confirm('确定要删除该技能吗？此操作不可恢复！')) {
      setSkills(skills.filter(skill => skill.id !== id));
    }
  };

  // 点击弹窗外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    };

    if (modalVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalVisible]);

  return (
    <div className="skill-management-page">
      {/* 页面头部 */}
      <div className="page-header">
        <h1>技能管理</h1>
        <button onClick={openAddModal} className="btn add-btn">
          <span className="icon">+</span> 新增技能
        </button>
      </div>

      {/* 筛选和搜索区域 */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索技能名称/编码/描述..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="status-filter">
          <label>状态筛选：</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="active">已启用</option>
            <option value="inactive">已禁用</option>
          </select>
        </div>
        <button onClick={refresh} className='btn empty-add-btn'>刷新</button>
      </div>

      {/* 技能列表 */}
      <div className="skills-list">
        {filteredSkills.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">暂无技能数据</div>
            <button onClick={openAddModal} className="btn empty-add-btn">
              立即创建第一个技能
            </button>
          </div>
        ) : (
          <div className="skills-table">
            <div className="table-header">
              <div className="table-cell name-col">技能名称</div>
              <div className="table-cell code-col">技能编码</div>
              <div className="table-cell desc-col">描述</div>
              <div className="table-cell status-col">状态</div>
              <div className="table-cell time-col">更新时间</div>
              <div className="table-cell action-col">操作</div>
            </div>
            <div className="table-body">
              {filteredSkills.map(skill => (
                <div key={skill.id} className="table-row">
                  <div className="table-cell name-col">{skill.name}</div>
                  <div className="table-cell code-col">{skill.code}</div>
                  <div className="table-cell desc-col">{skill.description}</div>
                  <div className="table-cell status-col">
                    <span className={`status-tag ${skill.status}`}>
                      {skill.status === 'active' ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  <div className="table-cell time-col">{skill.updateTime}</div>
                  <div className="table-cell action-col">
                    <button 
                      onClick={() => toggleSkillStatus(skill.id)}
                      className={`action-btn status-btn ${skill.status}`}
                    >
                      {skill.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button 
                      onClick={() => openEditModal(skill)}
                      className="action-btn edit-btn"
                    >
                      编辑
                    </button>
                    <button 
                      onClick={() => deleteSkill(skill.id)}
                      className="action-btn delete-btn"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 新增/编辑技能弹窗 */}
      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-content" ref={modalRef}>
            <div className="modal-header">
              <h2>{isEditMode ? '编辑技能' : '新增技能'}</h2>
              <button onClick={closeModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>技能名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="请输入技能名称"
                />
              </div>
              <div className="form-group">
                <label>技能编码 *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="请输入技能编码（大写英文/数字）"
                  disabled={isEditMode} // 编码不可修改
                />
              </div>
              <div className="form-group">
                <label>技能描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="请输入技能描述信息"
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeModal} className="btn cancel-btn">取消</button>
              <button onClick={handleSubmit} className="btn confirm-btn">
                {isEditMode ? '保存修改' : '创建技能'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillManagementPage;