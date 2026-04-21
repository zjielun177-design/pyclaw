const AboutPage = () => {
  return (
    <div className="about-page">
      <div className="page-header">
        <div>
          <h1>关于控制台</h1>
          <p>这是一个面向 pyclaw 的 WebSocket 前端工作台，用来完成连接、对话与管理。</p>
        </div>
      </div>

      <div className="about-card">
        <h3>版本信息</h3>
        <p>版本号：v1.0.0</p>
        <p>构建日期：{new Date().toLocaleDateString()}</p>
        <p>基于 React 与 WebSocket 构建</p>
      </div>

      <div className="about-card">
        <h3>主要功能</h3>
        <ul>
          <li>支持 WebSocket 连接与断开</li>
          <li>实时消息收发</li>
          <li>消息日志记录</li>
          <li>响应式界面布局</li>
        </ul>
      </div>

      <div className="about-card">
        <h3>技术栈</h3>
        <div className="tech-stack">
          <span>React 18</span>
          <span>React Router 6</span>
          <span>WebSocket API</span>
          <span>CSS3</span>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
