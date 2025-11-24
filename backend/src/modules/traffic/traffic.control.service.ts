import { Injectable, Logger } from '@nestjs/common';
import { TrafficState, TrafficControlDecision, LightState, RoadTrafficStatus } from './entities/traffic.entity';

/**
 * TrafficControlService implements the adaptive traffic light control algorithm.
 * 
 * Algorithm Rules:
 * 1. Emergency vehicles get immediate priority (green light)
 * 2. If no emergency, choose the road with the most vehicles
 * 3. Maintain a cycle queue to ensure all roads get green light eventually
 * 4. Green light duration: 8-15 seconds, adaptive based on vehicle density
 * 5. Log all decisions with full state and reasoning
 */
@Injectable()
export class TrafficControlService {
  private readonly logger = new Logger(TrafficControlService.name);
  
  // Current cycle queue (road IDs in order)
  private cycleQueue: number[] = [1, 2, 3, 4]; // North, East, South, West
  
  // Current green road
  private currentGreenRoadId: number = 1;
  
  // Time remaining for current green light
  private timeRemaining: number = 10;
  
  // Minimum and maximum green light duration
  private readonly MIN_GREEN_DURATION = 8;
  private readonly MAX_GREEN_DURATION = 15;

  /**
   * Calculate the optimal traffic light decision based on current state
   * 
   * @param currentState - Current traffic status for all roads
   * @returns Traffic control decision with green road, duration, and reason
   */
  calculateOptimalDecision(currentState: TrafficState): TrafficControlDecision {
    const roads = [
      { id: 1, direction: 'north', status: currentState.north },
      { id: 2, direction: 'east', status: currentState.east },
      { id: 3, direction: 'south', status: currentState.south },
      { id: 4, direction: 'west', status: currentState.west },
    ];

    // Rule 1: Check for emergency vehicles
    const emergencyRoad = roads.find(road => road.status.isEmergency);
    if (emergencyRoad) {
      this.logger.warn(`Emergency vehicle detected on ${emergencyRoad.direction}!`);
      return this.createDecision(
        emergencyRoad.id,
        this.MAX_GREEN_DURATION,
        'EMERGENCY_PRIORITY',
      );
    }

    // Rule 2: If no emergency, check if current green light should continue
    const currentGreenRoad = roads.find(road => road.id === this.currentGreenRoadId);
    if (currentGreenRoad && this.timeRemaining > 0) {
      // Continue current green light
      return this.createDecision(
        this.currentGreenRoadId,
        this.timeRemaining,
        'CONTINUE_CURRENT',
      );
    }

    // Rule 3: Time to switch - choose next road with highest vehicle count
    const sortedByVehicles = [...roads].sort((a, b) => b.status.vehicles - a.status.vehicles);
    
    // Get next road from cycle queue that has vehicles
    const nextInQueue = this.getNextInQueue(roads);
    const highestTraffic = sortedByVehicles[0];

    let selectedRoad: typeof roads[0];
    let reason: string;

    // If the road with highest traffic has significantly more vehicles than next in queue
    if (highestTraffic.status.vehicles > nextInQueue.status.vehicles + 3) {
      selectedRoad = highestTraffic;
      reason = 'HIGH_TRAFFIC_ADAPTIVE';
    } else {
      // Follow queue to ensure fairness
      selectedRoad = { ...nextInQueue };
      reason = 'NORMAL_QUEUE_CYCLE';
    }

    // Calculate adaptive duration based on vehicle count
    const duration = this.calculateGreenDuration(selectedRoad.status.vehicles);

    // Update cycle queue
    this.updateCycleQueue(selectedRoad.id);

    return this.createDecision(selectedRoad.id, duration, reason);
  }

  /**
   * Get the next road in the cycle queue
   */
  private getNextInQueue(roads: Array<{ id: number; direction: string; status: RoadTrafficStatus }>): typeof roads[0] {
    const currentIndex = this.cycleQueue.indexOf(this.currentGreenRoadId);
    const nextIndex = (currentIndex + 1) % this.cycleQueue.length;
    const nextRoadId = this.cycleQueue[nextIndex];
    return roads.find(r => r.id === nextRoadId) || roads[0];
  }

  /**
   * Calculate green light duration based on vehicle count
   * More vehicles = longer green time (within limits)
   */
  private calculateGreenDuration(vehicleCount: number): number {
    if (vehicleCount === 0) return this.MIN_GREEN_DURATION;
    if (vehicleCount >= 10) return this.MAX_GREEN_DURATION;
    
    // Linear interpolation between MIN and MAX
    const ratio = vehicleCount / 10;
    return Math.round(this.MIN_GREEN_DURATION + (this.MAX_GREEN_DURATION - this.MIN_GREEN_DURATION) * ratio);
  }

  /**
   * Update the cycle queue after a road gets green light
   */
  private updateCycleQueue(greenRoadId: number): void {
    // Move the green road to the end of the queue
    this.cycleQueue = this.cycleQueue.filter(id => id !== greenRoadId);
    this.cycleQueue.push(greenRoadId);
    this.currentGreenRoadId = greenRoadId;
  }

  /**
   * Create a traffic control decision object
   */
  private createDecision(
    greenRoadId: number,
    duration: number,
    reason: string,
  ): TrafficControlDecision {
    this.timeRemaining = duration;
    this.currentGreenRoadId = greenRoadId;

    return {
      greenRoadId,
      duration,
      reason,
      nextQueue: [...this.cycleQueue],
    };
  }

  /**
   * Decrement time remaining (called every second)
   */
  decrementTime(): void {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
    }
  }

  /**
   * Get current cycle queue
   */
  getCycleQueue(): number[] {
    return [...this.cycleQueue];
  }

  /**
   * Get current green road ID
   */
  getCurrentGreenRoadId(): number {
    return this.currentGreenRoadId;
  }

  /**
   * Get time remaining for current green light
   */
  getTimeRemaining(): number {
    return this.timeRemaining;
  }
}
