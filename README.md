A CN WEB

Chạy docker: docker compose -f docker-compose.rtsp.yml up -d

Không cần dùng 
(Lệnh khởi động RSTP cam (4 cam dùng 4 terminal)
ffmpeg -re -stream_loop -1 -i videos/west.mp4 `
     -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p `
     -f rtsp -rtsp_transport tcp rtsp://localhost:8554/west)