import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const cache = new Map();

export default function SnapshotImage({
  cameraId,
  alt,
  style,
  className,
  refreshMs = 0,
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);

  const key = useMemo(() => String(cameraId ?? ""), [cameraId]);

  useEffect(() => {
    let alive = true;
    let timer = null;

    const revoke = (u) => {
      try {
        if (u) URL.revokeObjectURL(u);
      } catch {}
    };

    const load = async () => {
      if (!cameraId) return;

      // Small FE cache to avoid duplicate requests when multiple components mount.
      const cached = cache.get(key);
      const now = Date.now();
      if (cached && cached.url && now - cached.ts < 2500) {
        setError(false);
        setUrl(cached.url);
        return;
      }

      try {
        const res = await api.get(`/cameras/${cameraId}/snapshot.jpg`, {
          responseType: "blob",
          headers: {
            // some proxies like explicit accepts
            Accept: "image/jpeg",
          },
        });

        const blob = res?.data;
        if (!blob) throw new Error("No snapshot data");

        const nextUrl = URL.createObjectURL(blob);

        // update cache
        cache.set(key, { ts: Date.now(), url: nextUrl });

        if (!alive) {
          revoke(nextUrl);
          return;
        }

        setError(false);
        setUrl((prev) => {
          // Revoke old URL after swap.
          revoke(prev);
          return nextUrl;
        });
      } catch {
        if (!alive) return;
        setError(true);
      }
    };

    load();

    if (refreshMs && refreshMs > 0) {
      timer = setInterval(load, refreshMs);
    }

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      setUrl((prev) => {
        revoke(prev);
        return "";
      });
    };
  }, [cameraId, key, refreshMs]);

  if (error || !cameraId) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 12,
          background: "#000",
        }}
      >
        Snapshot không khả dụng
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 12,
          background: "#000",
        }}
      >
        Đang tải snapshot…
      </div>
    );
  }

  return <img src={url} alt={alt || "snapshot"} className={className} style={style} />;
}
