"""Gateway WebSocket 服务器

提供 WebSocket RPC 服务器，支持远程控制 Agent 和 Web UI 连接。
"""
import asyncio
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Dict, Set, Callable, Any, List

from pydantic import BaseModel, Field

try:
    import websockets.server as ws_server
    from websockets.exceptions import ConnectionClosed
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    ws_server = None
    ConnectionClosed = Exception

from pyclaw.gateway.rpc import GatewayRequest, GatewayResponse, GatewayNotification, GatewayError
from pyclaw.agent.loop import AgentLoop
from pyclaw.config.schema import Config
from loguru import logger
from pyclaw.bus.events import InboundMessage, OutboundMessage
from pyclaw.bus.queue import MessageBus


class GatewayConfig(BaseModel):
    """Gateway 服务器配置.

    Attributes:
        host: 监听主机地址
        port: 监听端口
        ping_interval: WebSocket ping 间隔（秒）
        ping_timeout: WebSocket ping 超时（秒）
        max_connections: 最大并发连接数
        debug_mode: 是否启用调试模式
    """

    host: str = Field(
        default="0.0.0.0",
        description="监听主机地址"
    )
    port: int = Field(
        default=18790,
        ge=1,
        le=65535,
        description="监听端口"
    )
    ping_interval: int = Field(
        default=20,
        ge=1,
        description="WebSocket ping 间隔（秒）"
    )
    ping_timeout: int = Field(
        default=20,
        ge=1,
        description="WebSocket ping 超时（秒）"
    )
    max_connections: int = Field(
        default=10,
        ge=1,
        le=100,
        description="最大并发连接数"
    )
    debug_mode: bool = Field(
        default=True,
        description="是否启用调试模式"
    )


@dataclass
class ClientConnection:
    """客户端连接信息.

    Attributes:
        id: 客户端 ID
        websocket: WebSocket 连接对象
        remote_address: 远程地址
        connected_at: 连接时间戳
    """
    id: str
    websocket: Any
    remote_address: str
    connected_at: float


class GatewayServer:
    """Gateway WebSocket RPC 服务器.

    提供 WebSocket RPC 接口，支持：
    1. 远程调用 Agent 方法
    2. 实时接收 Agent 消息
    3. 查询系统状态

    使用示例:
        >>> from pyclaw.gateway import GatewayServer
        >>> from pyclaw.config.schema import Config
        >>>
        >>> config = Config()
        >>> server = GatewayServer(config=config)
        >>> await server.start()
        >>> # 服务器运行在 ws://localhost:8765
    """
    name: str = "GatewayServer"
    def __init__(
        self,
        bus: MessageBus,
        config: Optional[Config] = None,
        gateway_config: Optional[GatewayConfig] = None
    ):
        """初始化 Gateway 服务器.

        Args:
            config: PyClaw 全局配置
            gateway_config: Gateway 服务器配置

        Raises:
            ImportError: 如果 websockets 库未安装
        """
        if not WEBSOCKETS_AVAILABLE:
            raise ImportError(
                "websockets library is required for Gateway. "
                "Install it with: pip install websockets"
            )

        self.bus = bus
        self.config = config or Config()
        self.gateway_config = gateway_config or GatewayConfig()

        # Agent 管理
        self._agents: Dict[str, AgentLoop] = {}
        self._default_agent: Optional[AgentLoop] = None

        # 连接管理
        self._connections: Dict[str, ClientConnection] = {}
        self._server: Optional[Any] = None
        self._running = False

        # RPC 方法注册
        self._rpc_methods: Dict[str, Callable] = {}

        # 注册内置 RPC 方法
        self._register_builtin_methods()

        self._dispatch_task: asyncio.Task | None = None


    def _register_builtin_methods(self):
        """注册内置 RPC 方法."""
        # Agent 方法
        self.register_rpc_method("agent.run", self._handle_agent_run)
        self.register_rpc_method("agent.getInfo", self._handle_agent_get_info)
        self.register_rpc_method("agent.getHistory", self._handle_agent_get_history)
        self.register_rpc_method("agent.clearHistory", self._handle_agent_clear_history)
        self.register_rpc_method("agent.listTools", self._handle_agent_list_tools)

        # System 方法
        self.register_rpc_method("system.status", self._handle_system_status)
        self.register_rpc_method("system.listAgents", self._handle_system_list_agents)
        self.register_rpc_method("system.getConfig", self._handle_system_get_config)
        self.register_rpc_method("system.listSkills", self._handle_system_list_skills)

    def register_rpc_method(self, method: str, handler: Callable):
        """注册 RPC 方法处理器.

        Args:
            method: 方法名（如 "agent.run"）
            handler: 处理函数，签名为 async def handler(params: dict) -> Any
        """
        self._rpc_methods[method] = handler
        if self.gateway_config.debug_mode:
            logger.debug(f"Registered RPC method: {method}")

    def register_agent(self, name: str, agent: AgentLoop, set_default: bool = False):
        """注册 Agent 到 Gateway.

        Args:
            name: Agent 名称
            agent: AgentLoop 实例
            set_default: 是否设置为默认 Agent
        """
        self._agents[name] = agent
        if set_default or self._default_agent is None:
            self._default_agent = agent

        if self.gateway_config.debug_mode:
            logger.debug(f"Registered agent: {name}")

    def get_agent(self, name: Optional[str] = None) -> Optional[AgentLoop]:
        """获取 Agent.

        Args:
            name: Agent 名称（None 表示默认 Agent）

        Returns:
            AgentLoop 实例，如果未找到返回 None
        """
        if name is None:
            return self._default_agent

        return self._agents.get(name)

    async def _dispatch_websocket(self) -> None:
        """Dispatch outbound messages to the appropriate channel."""
        logger.info("Outbound dispatcher started")
        
        while True:
            try:
                msg = await asyncio.wait_for(
                    self.bus.consume_websocket(),
                    timeout=1.0
                )
                
                # 发送消息给web端
                for client_id, conn in self._connections.items():
                    if client_id == msg.channel:
                        try:
                            mesg = msg.content.replace('"',"'")
                            await conn.websocket.send('{"jsonrpc": "2.0", "id": "1001", "result": "'+mesg+'"}')
                        except Exception:
                            disconnected.append(client_id)


            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

    async def start(self):
        """启动 Gateway 服务器.

        Raises:
            RuntimeError: 如果服务器已经在运行
        """
        if self._running:
            raise RuntimeError("Gateway server is already running")

        self._running = True

        if self.gateway_config.debug_mode:
            logger.info(f"Starting Gateway server on {self.gateway_config.host}:{self.gateway_config.port}")

        # 创建 WebSocket 服务器
        self._server = await ws_server.serve(
            self._handle_websocket,
            self.gateway_config.host,
            self.gateway_config.port,
            ping_interval=self.gateway_config.ping_interval,
            ping_timeout=self.gateway_config.ping_timeout,
        )
        # Start outbound dispatcher
        self._dispatch_task = asyncio.create_task(self._dispatch_websocket())

        logger.info(f"Gateway server started on ws://{self.gateway_config.host}:{self.gateway_config.port}")

    async def stop(self):
        """停止 Gateway 服务器."""
        if not self._running:
            return

        self._running = False

        # 关闭所有连接
        for conn in list(self._connections.values()):
            try:
                await conn.websocket.close()
            except Exception:
                pass

        self._connections.clear()
        # Stop dispatcher
        if self._dispatch_task:
            self._dispatch_task.cancel()
            try:
                await self._dispatch_task
            except asyncio.CancelledError:
                pass

        # 关闭服务器
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

        logger.info("Gateway server stopped")

    async def _handle_websocket(self, websocket: Any, path: str):
        """处理 WebSocket 连接.

        Args:
            websocket: WebSocket 连接对象
            path: 请求路径
        """
        # 检查连接数限制
        if len(self._connections) >= self.gateway_config.max_connections:
            await websocket.close(1013, "Server full")
            return

        # 获取远程地址
        remote_addr = websocket.remote_address if hasattr(websocket, 'remote_address') else "unknown"
        client_id = f"client_{id(websocket)}"

        # 创建连接信息
        import time
        connection = ClientConnection(
            id=client_id,
            websocket=websocket,
            remote_address=remote_addr,
            connected_at=time.time()
        )

        self._connections[client_id] = connection

        if self.gateway_config.debug_mode:
            logger.info(f"Client connected: {client_id} from {remote_addr}")

        try:
            # 处理消息循环
            async for message in websocket:
                try:
                    response = await self._process_message(client_id, message)
                    if response:
                        await websocket.send(response)
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    error_response = GatewayResponse.error(
                        id="unknown",
                        error=GatewayError.internal_error(str(e))
                    )
                    await websocket.send(error_response.to_json())

        except ConnectionClosed:
            if self.gateway_config.debug_mode:
                logger.info(f"Client disconnected: {client_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            if client_id in self._connections:
                del self._connections[client_id]

    async def _process_message(self, client_id: str, message: str) -> Optional[str]:
        """处理客户端消息.

        Args:
            client_id: 客户端 ID
            message: 消息内容（JSON 字符串）

        Returns:
            响应 JSON 字符串（如果需要响应）
        """
        try:
            # 解析请求
            request = GatewayRequest.from_json(message)

            if self.gateway_config.debug_mode:
                logger.debug(f"[{client_id}] Request: {request.method}")

            # 路由到对应的处理器
            handler = self._rpc_methods.get(request.method)
            if not handler:
                error = GatewayError.method_not_found(request.method)
                return GatewayResponse.error(request.id, error).to_json()

            # 调用处理器
            try:
                request.params['client_id'] = client_id
                result = await handler(request.params)
                # 这个处理器不会立即返回结果，需要等待agent执行返回真正结果
                response = GatewayResponse.success(request.id, result)
            except GatewayError as e:
                response = GatewayResponse.error(request.id, e)
            except Exception as e:
                logger.error(f"Handler error: {e}")
                error = GatewayError.internal_error(str(e))
                response = GatewayResponse.error(request.id, error)
            return response.to_json()

        except ValueError as e:
            # JSON 解析或验证错误
            logger.error(f"Invalid message: {e}")
            error = GatewayError(
                code=GatewayErrorCode.PARSE_ERROR,
                message=str(e)
            )
            return GatewayResponse.error("unknown", error).to_json()

    async def broadcast_notification(self, notification: GatewayNotification):
        """向所有连接的客户端广播通知.

        Args:
            notification: 通知对象
        """
        message = notification.to_json()
        disconnected = []

        for client_id, conn in self._connections.items():
            try:
                await conn.websocket.send(message)
            except Exception:
                disconnected.append(client_id)

        # 清理断开的连接
        for client_id in disconnected:
            del self._connections[client_id]

    async def send_to_client(self, client_id: str, notification: GatewayNotification):
        """向特定客户端发送通知.

        Args:
            client_id: 客户端 ID
            notification: 通知对象
        """
        if client_id not in self._connections:
            logger.warning(f"Client not found: {client_id}")
            return

        try:
            await self._connections[client_id].websocket.send(notification.to_json())
        except Exception as e:
            logger.error(f"Error sending to client {client_id}: {e}")

    # ========================================================================
    # Agent RPC 处理器
    # ========================================================================

    async def _handle_agent_run(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理 agent.run 请求.

        Args:
            params: {"agent": "agent_name", "message": "hello", "system": "...", "stream": bool}

        Returns:
            {"response": "Agent response", "history_length": int}
        """
        agent_name = params.get("agent")
        message = params.get("message", "")
        id = params.get("id")
        client_id = params.get("client_id")
        system_prompt = params.get("system")
        stream = params.get("stream", False)

        # 获取 Agent
        agent = self.get_agent(agent_name)
        if not agent:
            raise GatewayError.agent_not_found(agent_name or "default")

        # 设置系统提示词（如果提供）
        original_system = None
        if system_prompt:
            original_system = agent.system_prompt
            agent.system_prompt = system_prompt

        # Forward to message bus
        # reply_to = chat_id if chat_type == "group" else sender_id
        await self._handle_message(
            sender_id=client_id,
            chat_id=id,
            content=message,
            metadata={
                "message_id": "123",
                "chat_type": "group",
                "msg_type": "text",
            }
        )
        # 这个地方不会立即返回结果，要等agent执行结果通过消息bus返回真正的结果

    def is_allowed(self, sender_id: str) -> bool:
        """
        Check if a sender is allowed to use this bot.
        
        Args:
            sender_id: The sender's identifier.
        
        Returns:
            True if allowed, False otherwise.
        """
        allow_list = getattr(self.config, "allow_from", [])
        
        # If no allow list, allow everyone
        if not allow_list:
            return True
        
        sender_str = str(sender_id)
        if sender_str in allow_list:
            return True
        if "|" in sender_str:
            for part in sender_str.split("|"):
                if part and part in allow_list:
                    return True
        return False
    
    
    # ========================================================================
    # Bus 消息处理器
    # ========================================================================
    async def _handle_message(
        self,
        sender_id: str,
        chat_id: str,
        content: str,
        media: list[str] | None = None,
        metadata: dict[str, Any] | None = None
    ) -> None:
        """
        Handle an incoming message from the chat platform.
        
        This method checks permissions and forwards to the bus.
        
        Args:
            sender_id: The sender's identifier.
            chat_id: The chat/channel identifier.
            content: Message text content.
            media: Optional list of media URLs.
            metadata: Optional channel-specific metadata.
        """
        if not self.is_allowed(sender_id):
            return
        msg = InboundMessage(
            channel=self.name,
            sender_id=str(sender_id),
            chat_id=str(chat_id),
            content=content,
            media=media or [],
            metadata=metadata or {}
        )
        
        await self.bus.publish_inbound(msg)
    
    @property
    def is_running(self) -> bool:
        """Check if the channel is running."""
        return self._running

    async def _handle_agent_get_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理 agent.getInfo 请求.

        Args:
            params: {"agent": "agent_name"}

        Returns:
            Agent 信息字典
        """
        agent_name = params.get("agent")
        agent = self.get_agent(agent_name)

        if not agent:
            raise GatewayError.agent_not_found(agent_name or "default")

        info = agent.get_info()
        return info

    async def _handle_agent_get_history(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """处理 agent.getHistory 请求.

        Args:
            params: {"agent": "agent_name"}

        Returns:
            历史消息列表
        """
        agent_name = params.get("agent")
        agent = self.get_agent(agent_name)

        if not agent:
            raise GatewayError.agent_not_found(agent_name or "default")

        history = agent.get_history()
        return [msg.model_dump() for msg in history]

    async def _handle_agent_clear_history(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理 agent.clearHistory 请求.

        Args:
            params: {"agent": "agent_name"}

        Returns:
            {"success": bool}
        """
        agent_name = params.get("agent")
        agent = self.get_agent(agent_name)

        if not agent:
            raise GatewayError.agent_not_found(agent_name or "default")

        agent.clear_history()
        return {"success": True, "agent": agent_name or agent.name}

    async def _handle_agent_list_tools(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """处理 agent.listTools 请求.

        Args:
            params: {"agent": "agent_name"}

        Returns:
            agent注册的tools列表
        """
        agent_name = params.get("agent")
        agent = self.get_agent(agent_name)

        if not agent:
            raise GatewayError.agent_not_found(agent_name or "default")
        tools = agent.get_tools()
        print(tools[0]['function'])
        full_tools = []
        for t in tools:
            tool = {}
            index = tools.index(t)
            tool['id'] = index + 1
            tool['name'] = tools[index]['function']['name']
            tool['category'] = 'system'
            tool['version'] = '2.1.0'
            tool['status'] = 'inactive'
            tool['description'] = tools[index]['function']['description']
            tool['config'] = tools[index]['function']['parameters']
            tool['createTime'] = '2026-03-10 16:30:00'
            tool['updateTime'] = '2026-03-12 11:45:00'
            tool['author'] = '自定义'
            full_tools.append(tool)

        return full_tools


    # ========================================================================
    # System RPC 处理器
    # ========================================================================

    async def _handle_system_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理 system.status 请求.

        Returns:
            系统状态字典
        """
        return {
            "server": "running" if self._running else "stopped",
            "connections": len(self._connections),
            "agents": list(self._agents.keys()),
            "host": self.gateway_config.host,
            "port": self.gateway_config.port,
        }

    async def _handle_system_list_agents(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """处理 system.listAgents 请求.

        Returns:
            Agent 信息列表
        """
        agents = []
        for name, agent in self._agents.items():
            info = agent.get_info()
            info["name"] = name
            agents.append(info)
        return agents

    async def _handle_system_get_config(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理 system.getConfig 请求.

        Returns:
            配置字典
        """
        return self.config.model_dump()

    async def _handle_system_list_skills(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """处理 system.listSkills 请求.

        Args:
            params: {"agent": "agent_name"}

        Returns:
            skills列表
        """
        from pyclaw.config.loader import load_config
        from pyclaw.agent.skills import SkillsLoader
        # 加载配置
        config = load_config()
        skill = SkillsLoader(config.workspace_path)

        return skill.build_skills_list()

    # ========================================================================
    # 便捷方法
    # ========================================================================

    def get_status(self) -> Dict[str, Any]:
        """获取服务器状态（同步）.

        Returns:
            状态字典
        """
        return {
            "running": self._running,
            "host": self.gateway_config.host,
            "port": self.gateway_config.port,
            "connections": len(self._connections),
            "agents": list(self._agents.keys()),
        }

    @property
    def is_running(self) -> bool:
        """检查服务器是否在运行."""
        return self._running
