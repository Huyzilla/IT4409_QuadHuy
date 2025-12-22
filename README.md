Chạy lần lượt từng docker

1. Trong thư mục gốc của dự án, chạy: docker compose -f docker-compose.cam.yml up -d để khởi động 4 cam RTSP
2. Trong thư mục backend, chạy: 
- docker compose -f docker-compose.backend.yml run --rm backend npx prisma migrate dev --name init_db để khởi tạo bảng
- docker compose -f docker-compose.backend.yml up -d
3. Trong thư mục ai, chạy: docker compose -f docker-compose.ai.yml up -d để khởi động model

Cắt video: ffmpeg -ss 10 -i input.mp4 -t 10 -an -vf "scale=512:288" -c:v libx264 -preset fast -crf 28 -r 25 video_demo.mp4