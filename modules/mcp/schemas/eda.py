from pydantic import BaseModel

class EDAParams(BaseModel):
    csv_path: str
