import { io } from "socket.io-client";

const BASE_URL =
    import.meta.env.VITE_SOCKET_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:3000";

// /ingest is intentionally unauthenticated.
export const ingestSocket = io(`${BASE_URL}/ingest`, {
    transports: ["websocket"],
    autoConnect: true,
});

ingestSocket.on("connect", () => {
    console.log("[WS FE] Connected to /ingest, socket ID:", ingestSocket.id);
});

// /traffic requires JWT at handshake. We connect/disconnect it based on auth state.
let trafficSocket = null;

export const connectTrafficSocket = () => {
    const token = localStorage.getItem("traffic-access-token");

    if (!trafficSocket) {
        trafficSocket = io(`${BASE_URL}/traffic`, {
            transports: ["websocket"],
            autoConnect: false,
            auth: { token },
        });

        trafficSocket.on("connect", () => {
            try {
                window.dispatchEvent(new Event("socket:connect"));
            } catch {}
        });

        trafficSocket.on("connect_error", (err) => {
            console.warn("[WS FE] /traffic connect_error:", err?.message || err);
        });
    }

    trafficSocket.auth = { token };
    if (!trafficSocket.connected) {
        trafficSocket.connect();
    }

    return trafficSocket;
};

export const disconnectTrafficSocket = () => {
    if (!trafficSocket) return;
    try {
        trafficSocket.disconnect();
    } catch {}
};

export const getTrafficSocket = () => trafficSocket;