/**
 * Traffic light states
 */
export enum LightState {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

/**
 * Road direction in an intersection
 */
export enum RoadDirection {
  NORTH = 'north',
  EAST = 'east',
  SOUTH = 'south',
  WEST = 'west',
}

/**
 * Traffic status for a single road
 */
export interface RoadTrafficStatus {
  vehicles: number;
  light: LightState;
  remaining: number; // Time remaining in seconds
  isEmergency?: boolean;
}

/**
 * Complete traffic state for all roads in an intersection
 */
export interface TrafficState {
  north: RoadTrafficStatus;
  east: RoadTrafficStatus;
  south: RoadTrafficStatus;
  west: RoadTrafficStatus;
}

/**
 * Traffic control decision
 */
export interface TrafficControlDecision {
  greenRoadId: number;
  duration: number;
  reason: string;
  nextQueue: number[];
}
