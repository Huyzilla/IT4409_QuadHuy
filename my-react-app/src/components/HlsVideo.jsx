import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function HlsVideo({ src, ...videoProps }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.debug('HlsVideo: mount/update', { src });

    // Clear previous playback state
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (!src) return;

    let hls;

    // Safari supports HLS natively
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else {
      // Fallback: try direct src
      video.src = src;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  return <video ref={videoRef} {...videoProps} />;
}
