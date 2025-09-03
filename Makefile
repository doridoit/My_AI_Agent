PY := $(shell pwd)
export PYTHONPATH := $(PY)

# uvicorn 공통 실행자/옵션
UV := python -m uvicorn
HOST := 0.0.0.0
UVFLAGS := --host $(HOST)

# Phony targets don't represent files
.PHONY: run stop run-core-server run-data-tools-server run-api

# Default command to run all necessary services concurrently
# It now depends on the 'stop' target to clean up ports first.
run: stop
	@echo "Starting API + MCP servers..."
	@echo "- API Gateway:       http://localhost:9000"
	@echo "- Core Logic Server: http://localhost:8001"
	@echo "- Data Tools Server: http://localhost:8002"
	@echo "Press Ctrl+C to stop all services."
	@trap 'echo "\nStopping all services..."; kill $$! $(jobs -p) 2>/dev/null' SIGINT ; \
	$(UV) api.main:app $(UVFLAGS) --port 9000 --log-level warning & \
	$(UV) modules.mcp.servers.core_logic_server:app $(UVFLAGS) --port 8001 --log-level warning & \
	$(UV) modules.mcp.servers.data_tools_server:app $(UVFLAGS) --port 8002 --log-level warning & \
	wait

# Run all services in development mode

# New target to stop any lingering services on our ports
stop:
	@echo "Stopping any existing services on ports 9000, 8001, 8002..."
	@lsof -t -i:9000 | xargs kill -9 2>/dev/null || true
	@lsof -t -i:8001 | xargs kill -9 2>/dev/null || true
	@lsof -t -i:8002 | xargs kill -9 2>/dev/null || true

# --- Individual services for debugging ---

# Run only the Core Logic MCP server
run-core-server:
	$(UV) modules.mcp.servers.core_logic_server:app $(UVFLAGS) --port 8001

# Run only the Data Tools MCP server
run-data-tools-server:
	$(UV) modules.mcp.servers.data_tools_server:app $(UVFLAGS) --port 8002

# API Gateway (FastAPI)
run-api:
	$(UV) api.main:app $(UVFLAGS) --port 9000
