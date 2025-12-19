/**
 * Camera entity represents a traffic monitoring camera
 */
export interface Camera {
  id: number;
  name: string;
  videoSource: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Camera response for API endpoints
 */
export interface CameraResponse {
  id: number;
  name: string;
  videoSource: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}
