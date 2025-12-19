import React from "react";

const spinnerStyle = {
  display: "inline-block",
  width: 36,
  height: 36,
  border: "4px solid rgba(255,255,255,0.1)",
  borderTopColor: "rgba(255,255,255,0.8)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const container = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

export default function Spinner({ small } = {}) {
  const style = { ...spinnerStyle, width: small ? 20 : 36, height: small ? 20 : 36 };
  return (
    <div style={container}>
      <div style={style} />
      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
    </div>
  );
}
