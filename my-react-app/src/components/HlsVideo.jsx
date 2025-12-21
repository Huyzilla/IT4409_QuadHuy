import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function HlsVideo({ src, ...videoProps }) {
  const videoRef = useRef(null);

  const getBrowserFriendlyUrl = (originalUrl) => {
    if (!originalUrl) return "";

    if (originalUrl.includes("rtsp://mediamtx:8554")) {
      let newUrl = originalUrl.replace(
        "rtsp://mediamtx:8554",
        "http://localhost:8888"
      );
      return `${newUrl}/index.m3u8`;
    }

    return originalUrl;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = getBrowserFriendlyUrl(src);
    console.log("Playing URL:", hlsUrl);

    if (Hls.isSupported()) {
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }
  }, [src]);

  return <video ref={videoRef} controls muted {...videoProps} />;
}
