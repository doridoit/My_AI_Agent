import httpx
import os

# 서버 주소를 환경 변수에서 읽거나 기본값을 사용합니다.
CORE_LOGIC_SERVER_URL = os.getenv("CORE_LOGIC_SERVER_URL", "http://localhost:8001")
DATA_TOOLS_SERVER_URL = os.getenv("DATA_TOOLS_SERVER_URL", "http://localhost:8002")

# 서버 이름과 주소를 매핑합니다.
SERVER_MAP = {
    "ai.agent.core_logic": CORE_LOGIC_SERVER_URL,
    "ai.agent.data_tools": DATA_TOOLS_SERVER_URL,
}

def call(tool_fqn: str, args: dict, timeout: int = 60):
    """
    Calls an MCP tool using standard HTTP requests.
    
    Args:
        tool_fqn: The fully-qualified name of the tool, e.g., 'ai.agent.core_logic/chat_with_context'.
        args: A dictionary of arguments for the tool.
        timeout: Request timeout in seconds.

    Returns:
        The JSON response from the server.
    """
    try:
        server_name, endpoint = tool_fqn.split('/')
        base_url = SERVER_MAP.get(server_name)

        if not base_url:
            raise ValueError(f"Unknown MCP server: {server_name}")

        url = f"{base_url}/tools/{endpoint}"
        
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, json=args)
            response.raise_for_status()  # HTTP 4xx/5xx 에러 발생 시 예외 처리
            return response.json()

    except httpx.RequestError as e:
        # 네트워크 관련 예외 처리
        raise RuntimeError(f"MCP network error calling {tool_fqn}: {e}") from e
    except (ValueError, httpx.HTTPStatusError) as e:
        # 설정 또는 서버 상태 관련 예외 처리
        raise RuntimeError(f"MCP call failed for {tool_fqn}: {e}") from e
