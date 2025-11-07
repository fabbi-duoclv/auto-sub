
import { FrameData } from '../types';

const FRAME_CAPTURE_RATE = 2; // Capture 2 frames per second

/**
 * Extracts frames from a video file at a specified rate.
 * @param videoFile The video file to process.
 * @param onProgress Callback to report progress (0 to 1).
 * @returns A promise that resolves to an array of frame data.
 */
export const extractFrames = (
  videoFile: File,
  onProgress: (progress: number) => void
): Promise<{ frames: FrameData[], width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const videoUrl = URL.createObjectURL(videoFile);

    video.preload = 'metadata';
    video.src = videoUrl;
    
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      const frames: FrameData[] = [];
      let currentTime = 0;

      video.muted = true;
      video.playsInline = true;

      const captureFrame = () => {
        if (!ctx) {
          reject(new Error('Canvas context is not available.'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg').split(',')[1];
        frames.push({ time: currentTime, imageData });
        
        onProgress(currentTime / duration);

        currentTime += 1 / FRAME_CAPTURE_RATE;

        if (currentTime <= duration) {
          video.currentTime = currentTime;
        } else {
          URL.revokeObjectURL(videoUrl);
          resolve({ frames, width: canvas.width, height: canvas.height });
        }
      };

      video.onseeked = captureFrame;
      video.currentTime = 0;
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video file.'));
    };
  });
};
   