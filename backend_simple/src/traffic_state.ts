// Kiểu màu đèn
export type LightColor = 'RED' | 'GREEN' | 'YELLOW';

export interface RoadState {
  vehicles: number;
  isEmergency: boolean;
  light: LightColor;
  timeLeft: number;
}

export interface TrafficState {
  north: RoadState;
  east: RoadState;
  south: RoadState;
  west: RoadState;
}

// State mặc định ban đầu
export function defaultTrafficState(): TrafficState {
  return {
    north: { vehicles: 0, isEmergency: false, light: 'RED', timeLeft: 0 },
    east:  { vehicles: 0, isEmergency: false, light: 'RED', timeLeft: 0 },
    south: { vehicles: 0, isEmergency: false, light: 'RED', timeLeft: 0 },
    west:  { vehicles: 0, isEmergency: false, light: 'RED', timeLeft: 0 },
  };
}
