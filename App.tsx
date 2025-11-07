
import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon, VideoIcon, DownloadIcon } from './components/icons';
import { ProcessStage, SubtitleEvent } from './types';
import { extractFrames } from './utils/videoHelper';
import { extractTextFromFrames, translateTexts } from './services/geminiService';
import { generateAssFile } from './utils/assHelper';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{width: number; height: number}>({width: 1920, height: 1080});
  const [stage, setStage] = useState<ProcessStage>(ProcessStage.IDLE);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assFileContent, setAssFileContent] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetState();
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };
  
  const handleVideoMetadata = () => {
    if (videoRef.current) {
        setVideoDimensions({width: videoRef.current.videoWidth, height: videoRef.current.videoHeight});
    }
  };

  const resetState = () => {
    setVideoFile(null);
    if(videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setStage(ProcessStage.IDLE);
    setProgress(0);
    setError(null);
    setAssFileContent(null);
  };

  const generateSubtitles = useCallback(async () => {
    if (!videoFile) return;

    setError(null);
    setAssFileContent(null);
    setProgress(0);

    try {
      // 1. Extract Frames
      setStage(ProcessStage.EXTRACTING_FRAMES);
      const { frames, width, height } = await extractFrames(videoFile, (p) => setProgress(p * 0.2)); // 20% of total progress

      // 2. Analyze Text with Gemini
      setStage(ProcessStage.ANALYZING_TEXT);
      const originalEvents = await extractTextFromFrames(frames, (p) => setProgress(0.2 + p * 0.5)); // 50% of total progress

      // 3. Translate Text
      setStage(ProcessStage.TRANSLATING);
      setProgress(0.7);
      const textsToTranslate = originalEvents.map(e => e.text);
      const translationMap = await translateTexts(textsToTranslate);
      setProgress(0.85);

      const translatedEvents: SubtitleEvent[] = originalEvents.map(event => ({
        ...event,
        text: translationMap.get(event.text) || event.text,
      }));

      // 4. Generate .ass file
      setStage(ProcessStage.GENERATING_FILE);
      const assContent = generateAssFile(translatedEvents, width, height);
      setAssFileContent(assContent);
      setProgress(1);
      setStage(ProcessStage.DONE);

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setStage(ProcessStage.ERROR);
    }
  }, [videoFile]);
  
  const downloadAssFile = () => {
    if (!assFileContent || !videoFile) return;
    const blob = new Blob([assFileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = videoFile.name.split('.').slice(0, -1).join('.');
    a.download = `${fileName}.vi.ass`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            Video Auto-Subtitler
          </h1>
          <p className="text-gray-400 mt-2">
            Generate and translate subtitles for your short videos automatically with AI.
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-700">
          {!videoFile ? (
            <div className="flex justify-center items-center">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">MP4, MOV, WEBM or other short video formats</p>
                    </div>
                    <input id="file-upload" type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 bg-gray-700/50 p-4 rounded-lg">
                  <VideoIcon className="h-8 w-8 text-indigo-400 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-medium text-white truncate">{videoFile.name}</p>
                    <p className="text-sm text-gray-400">{Math.round(videoFile.size / 1024 / 1024)} MB</p>
                  </div>
              </div>

              {videoUrl && (
                  <div className="rounded-lg overflow-hidden border border-gray-700">
                     <video ref={videoRef} src={videoUrl} onLoadedMetadata={handleVideoMetadata} controls className="w-full h-auto" />
                  </div>
              )}
              
              <div className="pt-4 space-y-4">
                {stage !== ProcessStage.IDLE && (
                   <div className="w-full">
                       <div className="flex justify-between mb-1">
                          <span className="text-base font-medium text-indigo-300">{stage}</span>
                          <span className="text-sm font-medium text-indigo-300">{Math.round(progress * 100)}%</span>
                       </div>
                       <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }}></div>
                       </div>
                    </div>
                )}
                
                {error && <div className="text-center p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg">{error}</div>}

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={generateSubtitles}
                        disabled={stage !== ProcessStage.IDLE && stage !== ProcessStage.DONE && stage !== ProcessStage.ERROR}
                        className="w-full flex-1 text-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {stage === ProcessStage.IDLE || stage === ProcessStage.ERROR ? 'Generate Subtitles' : 'Processing...'}
                    </button>
                    {assFileContent && (
                        <button
                            onClick={downloadAssFile}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-300 bg-indigo-900/50 hover:bg-indigo-900 transition-all duration-200"
                        >
                            <DownloadIcon className="w-5 h-5"/>
                            Download .ass File
                        </button>
                    )}
                </div>
                <button onClick={resetState} className="w-full text-gray-400 hover:text-white text-sm mt-2">Upload another video</button>
              </div>
            </div>
          )}
        </main>

        <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Powered by Google Gemini. Optimized for CapCut PC.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
   