from flask import Flask, request, jsonify

app = Flask(__name__)

# API này phải trùng với link bạn cấu hình trong file AI (BACKEND_API_URL)
@app.route('/api/traffic-control', methods=['POST'])
def receive_traffic_data():
    print("\n" + "="*40)
    print(">>> [TEST] NHẬN DỮ LIỆU TỪ AI SYSTEM:")
    
    # Lấy JSON gửi sang
    data = request.json
    
    # In chi tiết để kiểm tra
    print(f"- Event: {data.get('event')}")
    print(f"- Decision: Bật đèn xanh đường {data['decision']['green_road_id']} trong {data['decision']['duration']}s")
    print(f"- Lý do: {data['decision']['reason']}")
    print(f"- Trạng thái xe các đường: {data['traffic_status']}")
    print("="*40 + "\n")
    
    return jsonify({"status": "success", "message": "Backend received data"}), 200

if __name__ == "__main__":
    # Chạy port 8000 (trùng với port trong code AI của bạn)
    print("Fake Backend đang chạy tại http://localhost:8000...")
    app.run(port=8000)