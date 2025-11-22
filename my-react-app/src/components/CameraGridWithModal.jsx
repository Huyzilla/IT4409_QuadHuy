import React, { useEffect, useRef, useState } from "react";
// import "./CameraGridModal.css";

export default function CameraGridWithModal({ cameras = [] }) {
  const [openCam, setOpenCam] = useState(null);
  const modalVideoRef = useRef(null);

  useEffect(() => {
    const videoEl = modalVideoRef.current;
    if (!videoEl) return;

    if (!openCam) {
      videoEl.srcObject = null;
      videoEl.src = "";
      return;
    }

    if (openCam.mediaStream) {
      videoEl.srcObject = openCam.mediaStream;
      videoEl.play().catch(() => {});
      return;
    }

    if (openCam.streamUrl) {
      videoEl.srcObject = null;
      videoEl.src = openCam.streamUrl;
      videoEl.play().catch(() => {});
      return;
    }

    videoEl.srcObject = null;
    videoEl.src = "";
  }, [openCam]);

  // tắt bằng nút ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpenCam(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (openCam) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => (document.body.style.overflow = prev);
    }
  }, [openCam]);

  return (
    <>
      <div className="ch-grid">
        {cameras.map((cam) => (
          <div className="ch-tile" key={cam.id}>
            <div className="ch-thumb">
              {cam.thumbnail ? (
                <img src={cam.thumbnail} alt={cam.name} />
              ) : cam.streamUrl ? (
                <video
                  src={cam.streamUrl}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  onClick={() => setOpenCam(cam)}
                />
              ) : (
                <div className="ch-placeholder">{cam.name}</div>
              )}
            </div>

            <div className="ch-footer">
              <div className="ch-name">{cam.name}</div>
              <div className="ch-actions">
                <button onClick={() => setOpenCam(cam)}>Xem chi tiết</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {openCam && (
        <div
          className="ch-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết ${openCam.name}`}
          onClick={() => setOpenCam(null)}
        >
          <div
            className="ch-modal"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <div className="ch-modal-header">
              <h3>{openCam.name}</h3>
              <button
                className="ch-close"
                aria-label="Đóng"
                onClick={() => setOpenCam(null)}
              >
                ✕
              </button>
            </div>

            <div className="ch-modal-body">
              {}
              <video
                ref={modalVideoRef}
                className="ch-modal-video"
                controls
                autoPlay
                playsInline
                // poster can show snapshot before stream starts
                poster={openCam.thumbnail || undefined}
              />
            </div>

            <div className="ch-modal-footer">
              <small>Camera ID: {openCam.id}</small>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
