from pydantic import BaseModel

class AnomParams(BaseModel):
    csv_path: str
    column: str
    z: float = 3.0
