import { io } from "socket.io-client";

const BASE_URL = "http://localhost:3001";

// Kết nối Dashboard (đèn, xe hiện tại)
export const trafficSocket = io(`${BASE_URL}/traffic`, {
  transports: ["websocket"],
  autoConnect: true,
});

// Kết nối Ingest (thống kê phút từ AI)
export const ingestSocket = io(`${BASE_URL}/ingest`, {
  transports: ["websocket"],
  autoConnect: true,
});

ingestSocket.on("connect", () => {
  console.log("[WS FE] Connected to /ingest, socket ID:", ingestSocket.id);
});

ingestSocket.on("new_minute_stats", (data) => {
  console.log("📈 Received new_minute_stats:", data);
});

ingestSocket.onAny((eventName, ...args) => {
  console.log(`[WS DEBUG] Event: ${eventName}`, args);
});

ingestSocket.on("disconnect", () => {
  console.log("[WS FE] Disconnected from /ingest");
});
