// src/socket.js
import { io } from "socket.io-client";

// Backend NestJS: TrafficGateway thường để namespace "/traffic"
// => URL sẽ là http://localhost:3000/traffic
// Nếu sau này anh đổi namespace thì sửa lại string này cho khớp.
export const trafficSocket = io("http://localhost:3000/traffic", {
    transports: ["websocket"],
    autoConnect: true,
});

// Log để debug
trafficSocket.on("connect", () => {
    console.log("[WS FE] Connected to /traffic, id =", trafficSocket.id);
});

trafficSocket.on("disconnect", () => {
    console.log("[WS FE] Disconnected from /traffic");
});

// Log mọi event để xem backend đang gửi gì
trafficSocket.onAny((event, ...args) => {
    console.log("[WS FE] event =", event, "args =", args);
});
