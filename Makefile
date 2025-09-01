PY := $(shell pwd)
export PYTHONPATH := $(PY)

# uvicorn 공통 실행자/옵션
UV := python -m uvicorn
HOST := 0.0.0.0
UVFLAGS := --host $(HOST)

# Phony targets don't represent files
.PHONY: run run-dev stop run-ui run-core-server run-data-tools-server

# Default command to run all necessary services concurrently
# It now depends on the 'stop' target to clean up ports first.
run: stop
	@echo "Starting all services..."
	@echo "- UI (Streamlit): http://localhost:8501"
	@echo "- Core Logic Server: http://localhost:8001"
	@echo "- Data Tools Server: http://localhost:8002"
	@echo "Press Ctrl+C to stop all services."
	@trap 'echo "\nStopping all services..."; kill $$! $(jobs -p) 2>/dev/null' SIGINT ; \
	streamlit run main.py & \
	$(UV) modules.mcp.servers.core_logic_server:app $(UVFLAGS) --port 8001 --log-level warning & \
	$(UV) modules.mcp.servers.data_tools_server:app $(UVFLAGS) --port 8002 --log-level warning & \
	wait

# Run all services in development mode
run-dev: stop
	@echo "Starting all services in DEV mode..."
	@trap 'echo "\nStopping all services..."; kill $$! $(jobs -p) 2>/dev/null' SIGINT ; \
	STREAMLIT_ENV=dev streamlit run main.py & \
	$(UV) modules.mcp.servers.core_logic_server:app $(UVFLAGS) --port 8001 & \
	$(UV) modules.mcp.servers.data_tools_server:app $(UVFLAGS) --port 8002 & \
	wait

# New target to stop any lingering services on our ports
stop:
	@echo "Stopping any existing services on ports 8501, 8001, 8002..."
	@lsof -t -i:8501 | xargs kill -9 2>/dev/null || true
	@lsof -t -i:8001 | xargs kill -9 2>/dev/null || true
	@lsof -t -i:8002 | xargs kill -9 2>/dev/null || true

# --- Individual services for debugging ---

# Run only the Streamlit UI
run-ui:
	streamlit run main.py

# Run only the Core Logic MCP server
run-core-server:
	$(UV) modules.mcp.servers.core_logic_server:app $(UVFLAGS) --port 8001

# Run only the Data Tools MCP server
run-data-tools-server:
	$(UV) modules.mcp.servers.data_tools_server:app $(UVFLAGS) --port 8002