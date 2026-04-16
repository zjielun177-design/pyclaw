"""System RPC 处理器

提供系统相关的 RPC 方法处理。
"""
import asyncio
import logging
import os
import platform
from typing import Dict, Any, TYPE_CHECKING

if TYPE_CHECKING:
    from pyclaw.gateway.server import GatewayServer


logger = logging.getLogger("pyclaw.gateway")


class SystemRPCHandler:
    """System RPC 处理器.

    提供系统相关的 RPC 方法，如：
    - system.status: 获取系统状态
    - system.listAgents: 列出所有 Agent
    - system.getConfig: 获取配置
    """

    def __init__(self, server: "GatewayServer"):
        """初始化 System RPC 处理器.

        Args:
            server: GatewayServer 实例
        """
        self.server = server

    async def get_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """获取系统状态.

        Args:
            params: 空字典

        Returns:
            系统状态字典
        """
        return {
            "server": {
                "running": self.server.is_running,
                "host": self.server.gateway_config.host,
                "port": self.server.gateway_config.port,
                "connections": len(self.server._connections),
            },
            "system": {
                "python_version": platform.python_version(),
                "platform": platform.platform(),
                "hostname": platform.node(),
            },
            "process": {
                "pid": os.getpid(),
                "threads": asyncio.get_event_loop()._num_tasks if hasattr(asyncio.get_event_loop(), '_num_tasks') else 0,
            }
        }

    async def list_agents(self, params: Dict[str, Any]) -> list:
        """列出所有 Agent.

        Args:
            params: 空字典

        Returns:
            Agent 信息列表
        """
        agents = []
        for name, agent in self.server._agents.items():
            info = agent.get_info()
            info["name"] = name
            agents.append(info)
        return agents

    async def get_config(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """获取配置.

        Args:
            params: 空字典

        Returns:
            配置字典
        """
        return self.server.config.model_dump()

    async def get_connections(self, params: Dict[str, Any]) -> list:
        """获取当前连接的客户端列表.

        Args:
            params: 空字典

        Returns:
            客户端连接信息列表
        """
        connections = []
        for client_id, conn in self.server._connections.items():
            connections.append({
                "id": client_id,
                "remote_address": conn.remote_address,
                "connected_at": conn.connected_at,
            })
        return connections