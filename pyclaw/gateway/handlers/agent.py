"""Agent RPC 处理器

提供 Agent 相关的 RPC 方法处理。
"""
import logging
from typing import Dict, Any, TYPE_CHECKING

from pyclaw.gateway.rpc import GatewayError, GatewayErrorCode, GatewayException

if TYPE_CHECKING:
    from pyclaw.agents.simple import SimpleAgent


logger = logging.getLogger("pyclaw.gateway")


class AgentRPCHandler:
    """Agent RPC 处理器.

    提供 Agent 相关的 RPC 方法，如：
    - agent.run: 运行 Agent
    - agent.getInfo: 获取 Agent 信息
    - agent.getHistory: 获取对话历史
    - agent.clearHistory: 清除历史
    """

    def __init__(self):
        """初始化 Agent RPC 处理器."""
        self._agents: Dict[str, "SimpleAgent"] = {}

    def register_agent(self, name: str, agent: "SimpleAgent"):
        """注册 Agent.

        Args:
            name: Agent 名称
            agent: SimpleAgent 实例
        """
        self._agents[name] = agent
        logger.debug(f"Registered agent in handler: {name}")

    def get_agent(self, name: str) -> "SimpleAgent":
        """获取 Agent.

        Args:
            name: Agent 名称

        Returns:
            SimpleAgent 实例

        Raises:
            GatewayException: 如果 Agent 未找到
        """
        agent = self._agents.get(name)
        if not agent:
            raise GatewayException(
                code=GatewayErrorCode.AGENT_NOT_FOUND,
                message=f"Agent not found: {name}"
            )
        return agent

    async def run(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """运行 Agent.

        Args:
            params: {
                "agent": str,          # Agent 名称
                "message": str,        # 用户消息
                "system": str,         # 可选，系统提示词
                "stream": bool         # 可选，是否流式响应
            }

        Returns:
            {
                "response": str,       # Agent 响应
                "agent": str,          # Agent 名称
                "history_length": int  # 历史长度
            }

        Raises:
            GatewayError: 如果 Agent 未找到或执行失败
        """
        agent_name = params.get("agent", "")
        message = params.get("message", "")
        system_prompt = params.get("system")
        stream = params.get("stream", False)

        if not message:
            raise GatewayException(
                code=GatewayErrorCode.INVALID_PARAMS,
                message="message is required"
            )

        agent = self.get_agent(agent_name)

        # 设置系统提示词（如果提供）
        original_system = None
        if system_prompt:
            original_system = agent.system_prompt
            agent.system_prompt = system_prompt

        try:
            # 运行 Agent
            response = await agent.run(message)

            return {
                "response": response.content,
                "agent": agent_name,
                "history_length": len(agent.get_history())
            }
        except Exception as e:
            logger.error(f"Agent execution error: {e}")
            raise GatewayException(
                code=GatewayErrorCode.AGENT_EXECUTION_ERROR,
                message=f"Agent execution error: {e}"
            )
        finally:
            if original_system is not None:
                agent.system_prompt = original_system

    async def get_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """获取 Agent 信息.

        Args:
            params: {"agent": str}

        Returns:
            Agent 信息字典

        Raises:
            GatewayError: 如果 Agent 未找到
        """
        agent_name = params.get("agent", "")
        agent = self.get_agent(agent_name)

        return agent.get_info()

    async def get_history(self, params: Dict[str, Any]) -> list:
        """获取对话历史.

        Args:
            params: {"agent": str}

        Returns:
            历史消息列表

        Raises:
            GatewayError: 如果 Agent 未找到
        """
        agent_name = params.get("agent", "")
        agent = self.get_agent(agent_name)

        history = agent.get_history()
        return [msg.model_dump() for msg in history]

    async def clear_history(self, params: Dict[str, Any]) -> Dict[str, bool]:
        """清除对话历史.

        Args:
            params: {"agent": str}

        Returns:
            {"success": bool}

        Raises:
            GatewayError: 如果 Agent 未找到
        """
        agent_name = params.get("agent", "")
        agent = self.get_agent(agent_name)

        agent.clear_history()
        return {"success": True}