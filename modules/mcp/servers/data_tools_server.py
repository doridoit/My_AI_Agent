from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel
from modules.processing.eda import quick_summary
import pandas as pd

app = FastMCP("ai.agent.data_tools")

class EDAParams(BaseModel):
    csv_path: str

@app.tool()
def eda_summary(params: EDAParams):
    df = pd.read_csv(params.csv_path)
    return quick_summary(df)

class PingParams(BaseModel):
    url: str

@app.tool()
def ping(params: PingParams):
    import requests, time
    t0 = time.time()
    try:
        r = requests.get(params.url, timeout=5)
        return {"status": r.status_code, "elapsed": round(time.time()-t0, 3)}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    app.run()
