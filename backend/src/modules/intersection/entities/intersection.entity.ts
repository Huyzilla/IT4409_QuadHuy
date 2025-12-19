/**
 * Intersection entity represents a traffic intersection with multiple roads
 */
export interface Intersection {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
