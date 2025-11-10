import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

# Định nghĩa cấu trúc data mà AI sẽ gửi lên
# (Giúp FastAPI kiểm tra dữ liệu)
class TrafficData(BaseModel):
    camera_id: str
    timestamp_ms: int
    vehicles_left: int
    intensity_left: str
    vehicles_right: int
    intensity_right: str

# Khởi tạo FastAPI
app = FastAPI()

@app.post("/api/ingest")
async def ingest_traffic_data(data: TrafficData):
    """
    Đây là endpoint "giả" mà AI của bạn sẽ gọi.
    Nó chỉ nhận dữ liệu và IN ra terminal.
    """
    print("--- BACKEND ĐÃ NHẬN ĐƯỢC DỮ LIỆU TỪ AI ---")
    # Dùng .model_dump_json() để in ra JSON đẹp
    print(data.model_dump_json(indent=2))
    print("------------------------------------------")
    
    # Trả về thông báo thành công
    return {"status": "success", "received_camera": data.camera_id}

# Chạy server
if __name__ == "__main__":
    print("Đang khởi chạy Mock Backend tại http://localhost:8000")
    # Chạy trên port 8000, giống hệt cấu hình 'backend_api_url'
    uvicorn.run(app, host="0.0.0.0", port=8000)