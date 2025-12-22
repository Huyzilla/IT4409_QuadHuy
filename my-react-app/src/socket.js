import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const getToken = () => localStorage.getItem("traffic-access-token");

// Dashboard namespace: /traffic
export const trafficSocket = io(`${BASE_URL}/traffic`, {
    transports: ["websocket"],
    autoConnect: false,
    auth: {},
});

// Ingest namespace: /ingest (minute stats from AI)
export const ingestSocket = io(`${BASE_URL}/ingest`, {
    transports: ["websocket"],
    autoConnect: true,
});

export const connectTrafficSocket = () => {
    const token = getToken();
    if (!token) {
        console.warn(
            "[WS FE] connectTrafficSocket: no token found in localStorage, skipping connect",
        );
        return;
    }
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

trafficSocket.on("connect", () => {
    console.log("[WS FE] Connected to /traffic, id =", trafficSocket.id);
    try {
        window.dispatchEvent(new Event("socket:connect"));
    } catch {
        // ignore
    }

    // Ask server for the current stream/frame immediately after connect so
    // SPA navigation doesn't wait for the next server push.
    try {
        trafficSocket.emit("request-initial-stream");
    } catch {
        // ignore
    }
});

trafficSocket.on("disconnect", () => {
    console.log("[WS FE] Disconnected from /traffic");
    try {
        window.dispatchEvent(new Event("socket:disconnect"));
    } catch {
        // ignore
    }
});

trafficSocket.on("connect_error", (err) => {
    console.log("[WS FE] connect_error:", err?.message || err);
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