import React from "react";
import { Outlet } from "react-router-dom";
import { TrafficProvider } from "../context/TrafficContext";

// TrafficLayout ensures that heavy traffic-related providers (data fetches, sockets)
// only initialize when the user navigates into the protected app area.
export default function TrafficLayout() {
  return (
    <TrafficProvider>
      <Outlet />
    </TrafficProvider>
  );
}
