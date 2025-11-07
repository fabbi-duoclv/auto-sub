
import { SubtitleEvent } from '../types';

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds - Math.floor(seconds)) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
};

export const generateAssFile = (
  events: SubtitleEvent[],
  videoWidth: number,
  videoHeight: number
): string => {
  const FONT_SIZE = Math.round(videoHeight / 20);

  const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes
YCbCr Matrix: None

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${FONT_SIZE},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogues = events.map(event => {
    const start = formatTime(event.start);
    const end = formatTime(event.end);
    // Use {\pos(x,y)} to position the subtitle. Alignment 5 is middle-center.
    // The position tag sets the center of the text block.
    const text = `{\\pos(${Math.round(event.x)},${Math.round(event.y)})} ${event.text}`;
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  }).join('\\n');

  return header + dialogues;
};
   