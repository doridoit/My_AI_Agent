.PHONY: run dev mcp
run:
	streamlit run main.py

dev:
	STREAMLIT_ENV=dev streamlit run main.py

mcp:
	python -m modules.mcp.servers.data_tools_server
