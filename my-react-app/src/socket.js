// src/socket.js
import { io } from "socket.io-client";

// Backend NestJS: TrafficGateway thường để namespace "/traffic"
// => URL sẽ là http://localhost:3000/traffic
// Nếu sau này anh đổi namespace thì sửa lại string này cho khớp.
const getToken = () => localStorage.getItem("traffic-access-token");

export const trafficSocket = io("http://localhost:3000/traffic", {
    transports: ["websocket"],
    autoConnect: false,
    auth: {},
});

export const connectTrafficSocket = () => {
    const token = getToken();
    if (!token) {
        console.warn('[WS FE] connectTrafficSocket: no token found in localStorage, skipping connect');
        return;
    }
    console.debug('[WS FE] connectTrafficSocket: using token', token?.slice?.(0, 8) + '...');
    trafficSocket.auth = { token };
    if (!trafficSocket.connected) {
        trafficSocket.connect();
    }
};

export const disconnectTrafficSocket = () => {
    if (trafficSocket.connected) {
        trafficSocket.disconnect();
    }
};

// Log để debug
trafficSocket.on("connect", () => {
    console.log("[WS FE] Connected to /traffic, id =", trafficSocket.id);
    try {
        window.dispatchEvent(new Event('socket:connect'));
    } catch (e) {}

    // Ask server for the current stream/frame immediately after connect so
    // SPA navigation doesn't wait for the next server push.
    try {
        trafficSocket.emit('request-initial-stream');
    } catch (e) {
        console.debug('[WS FE] Failed to emit request-initial-stream', e);
    }
});

trafficSocket.on("disconnect", () => {
    console.log("[WS FE] Disconnected from /traffic");
    try {
        window.dispatchEvent(new Event('socket:disconnect'));
    } catch (e) {}
});

trafficSocket.on("connect_error", (err) => {
    console.log("[WS FE] connect_error:", err?.message || err);
});

// Log mọi event để xem backend đang gửi gì
trafficSocket.onAny((event, ...args) => {
    console.log("[WS FE] event =", event, "args =", args);
});
