
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrResult {
  text: string;
  boundingBox: BoundingBox;
}

export interface FrameData {
  time: number;
  imageData: string; // base64
}

export interface SubtitleEvent {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
}

export enum ProcessStage {
  IDLE = 'Waiting for video...',
  EXTRACTING_FRAMES = 'Extracting frames from video...',
  ANALYZING_TEXT = 'Analyzing text with Gemini AI...',
  TRANSLATING = 'Translating text...',
  GENERATING_FILE = 'Generating subtitle file...',
  DONE = 'Processing complete!',
  ERROR = 'An error occurred.'
}
   