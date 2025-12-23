import React, { useState } from "react";
import SnapshotImage from "./SnapshotImage.jsx";
// import "./CameraGridModal.css";

export default function CameraGridWithModal({ cameras = [] }) {
    const [openCam, setOpenCam] = useState(null);

    const numCameras = cameras.length;
    let gridCols = 1;
    if (numCameras === 2) gridCols = 2;
    else if (numCameras === 3) gridCols = 3;
    else if (numCameras === 4) gridCols = 2;
    else if (numCameras >= 5) gridCols = 3;
    else if (numCameras === 1) gridCols = 1;

    React.useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && openCam) setOpenCam(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openCam]);

    React.useEffect(() => {
        if (openCam) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => (document.body.style.overflow = prev);
        }
    }, [openCam]);

    return (
        <>
            <div
                className="ch-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gap: '15px',
                    maxHeight: 'calc(95vh - 70px)',
                    overflowY: 'auto',
                    paddingRight: '10px'
                }}
            >
                {cameras.map((cam) => (
                    <div className="ch-tile" key={cam.id}>
                        <div
                            className="ch-thumb"
                            onClick={() => setOpenCam(cam)}
                            style={{
                                position: 'relative',
                                width: '100%',
                                paddingTop: '56.25%',
                                overflow: 'hidden',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-md)',
                                background: 'var(--color-bg-tertiary)'
                            }}
                        >
                            {cam?.id ? (
                                <SnapshotImage
                                    cameraId={cam.id}
                                    alt={cam.name}
                                    style={{
                                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <div
                                    className="ch-placeholder"
                                    style={{
                                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)'
                                    }}
                                >
                                    Snapshot: {cam.name}
                                </div>
                            )}
                        </div>

                        <div
                            className="ch-footer"
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'
                            }}
                        >
                            <div className="ch-name" style={{ fontSize: '15px', fontWeight: '600' }}>
                                {cam.name}
                            </div>
                            <div className="ch-actions">
                                <button
                                    onClick={() => setOpenCam(cam)}
                                    style={{
                                        padding: '6px 12px', background: 'var(--color-accent-blue)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                                    }}
                                >
                                    Xem chi tiết
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {openCam && (
                <div
                    className="ch-modal-overlay live-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Chi tiết ${openCam.name}`}
                    onClick={() => setOpenCam(null)}
                >
                    <div
                        className="ch-modal live-modal-content"
                        onClick={(e) => e.stopPropagation()}
                        tabIndex={-1}
                        style={{ maxWidth: '80%', maxHeight: '80vh', padding: '0', background: 'var(--color-bg-secondary)' }}
                    >
                        <div className="ch-modal-header live-modal-header" style={{ position: 'absolute', background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent)', padding: '15px 20px' }}>
                            <h3>{openCam.name}</h3>
                            <button
                                className="ch-close btn-close-modal"
                                aria-label="Đóng"
                                onClick={() => setOpenCam(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="ch-modal-body" style={{ width: '100%', height: '100%' }}>
                            <HlsVideo
                                src={openCam.streamUrl || openCam.videoSource}
                                className="ch-modal-video live-modal-video"
                                controls
                                autoPlay
                                playsInline
                                muted
                                poster={openCam.thumbnail || undefined}
                                style={{ height: '80vh', objectFit: 'contain' }}
                            />
                        </div>

                        <div className="ch-modal-footer" style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '10px 20px', background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)', color: 'var(--color-text-secondary)' }}>
                            <small>Camera ID: {openCam.id}</small>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}