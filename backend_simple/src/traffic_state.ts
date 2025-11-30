export type LightColor = 'RED' | 'GREEN' | 'YELLOW';
export type Direction = 'north' | 'east' | 'south' | 'west';

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

export function defaultTrafficState(): TrafficState {
  const lane = (): RoadState => ({
    vehicles: 0,
    isEmergency: false,
    light: 'RED',
    timeLeft: 0,
  });

  return {
    north: lane(),
    east: lane(),
    south: lane(),
    west: lane(),
  };
}

// Log 1 lần quyết định đèn
export interface DecisionLogEntry {
  timestamp: number;
  intersectionId: number;
  green: {
    roadId: number;
    direction: Direction;
    vehicles: number;
    duration: number;
    reason?: string;
  };
  reds: Array<{
    roadId: number;
    direction: Direction;
    vehicles: number;
  }>;
}
