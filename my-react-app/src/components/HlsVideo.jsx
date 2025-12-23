import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const HLS_BASE_URL = import.meta.env.VITE_HLS_BASE_URL || "http://localhost:8888";
const normalizeBase = (url) => String(url || "").replace(/\/+$/, "");

export default function HlsVideo({ src, ...videoProps }) {
    const videoRef = useRef(null);
    const [hasError, setHasError] = useState(false);

    const getBrowserFriendlyUrl = (originalUrl) => {
        if (!originalUrl) return "";

        // If already an HLS URL, keep it.
        if (typeof originalUrl === "string" && originalUrl.includes(".m3u8")) {
            return originalUrl;
        }

        // Convert any rtsp://<host>/<path> into HLS: <HLS_BASE_URL>/<path>/index.m3u8
        if (typeof originalUrl === "string" && originalUrl.startsWith("rtsp://")) {
            const match = originalUrl.match(/^rtsp:\/\/[^/]+\/(.+)$/);
            if (match && match[1]) {
                return `${normalizeBase(HLS_BASE_URL)}/${match[1]}/index.m3u8`;
            }
        }

        return originalUrl;
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        setHasError(false);

        const hlsUrl = getBrowserFriendlyUrl(src);

        const isHls = typeof hlsUrl === "string" && hlsUrl.includes(".m3u8");

        // Non-HLS sources: let the browser handle it.
        if (!isHls) {
            try {
                video.src = hlsUrl;
                const p = video.play();
                if (p && typeof p.catch === "function") p.catch(() => {});
            } catch {
                setHasError(true);
            }
            return;
        }

        // HLS playback.
        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: true,
                backBufferLength: 0,
                liveSyncDurationCount: 2,
                liveMaxLatencyDurationCount: 4,
            });

            let destroyed = false;
            const safeSetError = (v) => {
                if (!destroyed) setHasError(v);
            };

            hls.attachMedia(video);
            hls.loadSource(hlsUrl);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const p = video.play();
                if (p && typeof p.catch === "function") p.catch(() => {});
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (!data) return;
                if (!data.fatal) return;

                // Try recover first (live streams may briefly 404 segments).
                try {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        hls.startLoad();
                        safeSetError(false);
                        return;
                    }
                    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                        safeSetError(false);
                        return;
                    }
                } catch {
                    // fall through
                }

                safeSetError(true);
                try {
                    hls.destroy();
                } catch {}
            });

            return () => {
                destroyed = true;
                try {
                    hls.destroy();
                } catch {}
            };
        }

        // Safari (native HLS)
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = hlsUrl;
            const onLoaded = () => {
                const p = video.play();
                if (p && typeof p.catch === "function") p.catch(() => {});
            };
            video.addEventListener("loadedmetadata", onLoaded);
            return () => {
                video.removeEventListener("loadedmetadata", onLoaded);
            };
        }

        setHasError(true);
    }, [src]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <video ref={videoRef} {...videoProps} />
            {hasError && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "gray",
                        fontSize: 12,
                        background: "#000",
                    }}
                >
                    Mất tín hiệu
                </div>
            )}
        </div>
    );
}