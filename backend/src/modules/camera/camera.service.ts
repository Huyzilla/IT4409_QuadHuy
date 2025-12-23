import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { spawn } from 'node:child_process';
import { CameraRepository } from './camera.repository';
import { CreateCameraDto, UpdateCameraDto } from './dto/camera.dto';
import { Camera } from '@prisma/client';

/**
 * CameraService contains business logic for camera management
 */
@Injectable()
export class CameraService {
  constructor(private readonly cameraRepository: CameraRepository) {}

  private readonly snapshotTtlMs = 3000;
  private readonly snapshotTimeoutMs = 8000;
  private readonly snapshotCache = new Map<
    number,
    { ts: number; jpeg: Buffer; inflight?: Promise<Buffer> }
  >();

  /**
   * Get all cameras
   */
  async getAllCameras(): Promise<Camera[]> {
    return this.cameraRepository.findAll();
  }

  /**
   * Get camera by ID
   */
  async getCameraById(id: number): Promise<Camera> {
    const camera = await this.cameraRepository.findById(id);
    if (!camera) {
      throw new NotFoundException(`Camera with ID ${id} not found`);
    }
    return camera;
  }

  /**
   * Create a new camera
   */
  async createCamera(dto: CreateCameraDto): Promise<Camera> {
    return this.cameraRepository.create(dto);
  }

  /**
   * Update camera
   */
  async updateCamera(id: number, dto: UpdateCameraDto): Promise<Camera> {
    await this.getCameraById(id); // Validate existence
    return this.cameraRepository.update(id, dto);
  }

  /**
   * Delete camera
   */
  async deleteCamera(id: number): Promise<void> {
    await this.getCameraById(id); // Validate existence
    await this.cameraRepository.delete(id);
  }

  /**
   * Generate (and cache) a JPEG snapshot for a camera.
   * Uses ffmpeg to capture a single frame from the configured videoSource.
   */
  async getSnapshotJpeg(cameraId: number): Promise<Buffer> {
    const now = Date.now();
    const cached = this.snapshotCache.get(cameraId);
    if (cached && cached.jpeg && now - cached.ts < this.snapshotTtlMs) {
      return cached.jpeg;
    }
    if (cached?.inflight) {
      return cached.inflight;
    }

    const inflight = this.generateSnapshotJpeg(cameraId)
      .then((jpeg) => {
        this.snapshotCache.set(cameraId, { ts: Date.now(), jpeg });
        return jpeg;
      })
      .finally(() => {
        const cur = this.snapshotCache.get(cameraId);
        if (cur?.inflight) {
          this.snapshotCache.set(cameraId, {
            ts: cur.ts,
            jpeg: cur.jpeg,
          });
        }
      });

    this.snapshotCache.set(cameraId, {
      ts: cached?.ts ?? 0,
      jpeg: cached?.jpeg ?? Buffer.alloc(0),
      inflight,
    });
    return inflight;
  }

  private async generateSnapshotJpeg(cameraId: number): Promise<Buffer> {
    const camera = await this.cameraRepository.findById(cameraId);
    if (!camera) {
      throw new NotFoundException(`Camera with ID ${cameraId} not found`);
    }

    const inputUrl = camera.videoSource;
    if (!inputUrl) {
      throw new ServiceUnavailableException('Camera has no video source');
    }

    const ffmpegArgs = [
      '-hide_banner',
      '-loglevel',
      'error',
      // RTSP is common; these options help avoid long stalls.
      '-rtsp_transport',
      'tcp',
      '-i',
      inputUrl,
      '-frames:v',
      '1',
      '-q:v',
      '5',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ];

    return new Promise<Buffer>((resolve, reject) => {
      let stdoutChunks: Buffer[] = [];
      let stderrText = '';
      let done = false;

      const proc = spawn('ffmpeg', ffmpegArgs, {
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        try {
          proc.kill('SIGKILL');
        } catch {}
        reject(
          new ServiceUnavailableException(
            'Snapshot timed out while reading stream',
          ),
        );
      }, this.snapshotTimeoutMs);

      proc.stdout.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderrText += chunk.toString('utf8');
      });

      proc.on('error', (err) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        // Most common: ffmpeg binary missing in the runtime environment.
        reject(
          new ServiceUnavailableException(
            `Failed to start ffmpeg for snapshot: ${err.message}`,
          ),
        );
      });

      proc.on('close', (code) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);

        const out = Buffer.concat(stdoutChunks);
        if (code === 0 && out.length > 0) {
          resolve(out);
          return;
        }

        reject(
          new ServiceUnavailableException(
            `Snapshot failed (ffmpeg exit ${code ?? 'unknown'}). ${stderrText}`.trim(),
          ),
        );
      });
    });
  }
}
