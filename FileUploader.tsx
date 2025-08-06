import React, { useState, useCallback } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';
import LcarsButton from '../ui/LcarsButton';
import LcarsPanel from '../ui/LcarsPanel';
import LcarsProgress from '../ui/LcarsProgress';
import { useUploadAudio, useStartTranscription } from '../../hooks/useTranscriptions';

interface FileUploaderProps {
  onUploadComplete?: (transcriptionId: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  
  const uploadMutation = useUploadAudio();
  const startTranscriptionMutation = useStartTranscription();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 
      'audio/flac', 'audio/ogg', 'video/mp4', 'video/avi', 
      'video/mov', 'video/mkv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Please select an audio or video file.');
      return;
    }
    
    // Validate file size (100MB)
    if (file.size > 104857600) {
      alert('File size exceeds 100MB limit.');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setUploadProgress(25);
      const result = await uploadMutation.mutateAsync(selectedFile);
      setUploadProgress(50);
      
      const transcriptionId = (result as any).data?.transcriptionId || (result as any).transcriptionId;
      setTranscriptionId(transcriptionId);
      setUploadProgress(75);
      
      // Start transcription
      await startTranscriptionMutation.mutateAsync(transcriptionId);
      setUploadProgress(100);
      
      // Reset form after a delay
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        setTranscriptionId(null);
        onUploadComplete?.(transcriptionId);
      }, 2000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(0);
      alert('Upload failed. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isProcessing = uploadMutation.isPending || startTranscriptionMutation.isPending;

  return (
    <LcarsPanel title="Audio Transcription" subtitle="Upload audio or video files for analysis">
      <div className="space-y-6">
        {/* File Drop Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${
              dragActive
                ? 'border-[var(--lcars-orange)] bg-[var(--lcars-orange)]/10'
                : 'border-[var(--lcars-burnt-orange)] hover:border-[var(--lcars-orange)]'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".mp3,.wav,.m4a,.flac,.ogg,.mp4,.avi,.mov,.mkv"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <FileAudio className="w-12 h-12 text-lcars-orange" />
              </div>
              <div>
                <p className="text-lcars-white font-medium">{selectedFile.name}</p>
                <p className="text-lcars-grey text-sm">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="inline-flex items-center gap-2 text-lcars-red hover:text-red-400 transition-colors"
                disabled={isProcessing}
              >
                <X size={16} />
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="w-12 h-12 text-lcars-blue" />
              </div>
              <div>
                <p className="text-lcars-white font-medium mb-2">
                  Drop your audio or video file here
                </p>
                <p className="text-lcars-grey text-sm">
                  Supports MP3, WAV, M4A, FLAC, OGG, MP4, AVI, MOV, MKV
                </p>
                <p className="text-lcars-grey text-xs mt-1">
                  Maximum file size: 100MB
                </p>
              </div>
              <LcarsButton size="sm" variant="secondary">
                Choose File
              </LcarsButton>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && (
          <div className="space-y-4">
            <LcarsProgress
              value={uploadProgress}
              label="Transcription Progress"
              animated={uploadProgress < 100}
            />
            <div className="text-center">
              {uploadProgress < 50 && (
                <p className="text-lcars-blue text-sm uppercase tracking-wider">
                  Uploading file...
                </p>
              )}
              {uploadProgress >= 50 && uploadProgress < 75 && (
                <p className="text-lcars-orange text-sm uppercase tracking-wider">
                  Processing audio...
                </p>
              )}
              {uploadProgress >= 75 && uploadProgress < 100 && (
                <p className="text-lcars-orange text-sm uppercase tracking-wider">
                  Transcribing with AI...
                </p>
              )}
              {uploadProgress === 100 && (
                <p className="text-lcars-green text-sm uppercase tracking-wider">
                  Transcription complete!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && uploadProgress === 0 && (
          <div className="flex justify-center">
            <LcarsButton
              onClick={handleUpload}
              loading={isProcessing}
              size="lg"
            >
              Start Transcription
            </LcarsButton>
          </div>
        )}

        {/* AI Provider Info */}
        <div className="bg-[var(--lcars-panel-black)] rounded-lg p-4 border border-[var(--lcars-burnt-orange)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lcars-blue text-sm uppercase tracking-wider">
              AI Transcription Engine
            </span>
            <div className="w-2 h-2 bg-[var(--lcars-green)] rounded-full animate-pulse"></div>
          </div>
          <p className="text-lcars-white text-sm">
            Primary: Deepseek AI • Fallback: Gemini AI
          </p>
          <p className="text-lcars-grey text-xs mt-1">
            Real-time sentiment analysis and text enhancement
          </p>
        </div>
      </div>
    </LcarsPanel>
  );
};

export default FileUploader;
