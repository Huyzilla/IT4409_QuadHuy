Chạy lần lượt từng docker

1. Trong thư mục gốc của dự án, chạy: docker compose -f docker-compose.cam.yml up -d để khởi động 4 cam RTSP
2. Trong thư mục backend, chạy: docker compose -f docker-compose.backend.yml up -d
3. Trong thư mục ai, chạy: docker compose -f docker-compose.ai.yml up -d để khởi động model