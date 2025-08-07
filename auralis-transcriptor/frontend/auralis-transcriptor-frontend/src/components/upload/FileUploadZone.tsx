import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileAudio, FileVideo, AlertCircle } from 'lucide-react';
import LcarsButton from '../ui/LcarsButton';
import { validateFile } from '../../utils';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FileUploadZone({ onFileSelect, disabled = false }: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      try {
        validateFile(files[0]);
        onFileSelect(files[0]);
      } catch (error: any) {
        alert(error.message);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      try {
        validateFile(files[0]);
        onFileSelect(files[0]);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const acceptedTypes = ".mp3,.wav,.flac,.m4a,.mp4,.mov,.avi,.mkv";
  const maxSize = "500MB";

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
        dragActive 
          ? "border-cyan-400 bg-cyan-400/10" 
          : "border-cyan-400/50 hover:border-cyan-400/80"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple={false}
        accept={acceptedTypes}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
      />

      <motion.div 
        className="text-center"
        animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center">
          <Upload className="w-12 h-12 text-cyan-400" />
        </div>

        <h3 className="lcars-font text-2xl font-semibold text-cyan-300 mb-3">
          DATA TRANSMISSION INTERFACE
        </h3>
        <p className="text-cyan-200 mb-6 max-w-md mx-auto">
          {dragActive 
            ? "RELEASE TO INITIALIZE UPLOAD SEQUENCE" 
            : "DRAG & DROP YOUR AUDIO/VIDEO FILES OR CLICK TO SELECT"
          }
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-lg mx-auto">
          <div className="lcars-panel rounded-lg p-4">
            <FileAudio className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="data-font text-sm text-cyan-200">AUDIO FORMATS</div>
            <div className="data-font text-xs text-cyan-400 mt-1">MP3, WAV, FLAC, M4A</div>
          </div>
          <div className="lcars-panel rounded-lg p-4">
            <FileVideo className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="data-font text-sm text-cyan-200">VIDEO FORMATS</div>
            <div className="data-font text-xs text-cyan-400 mt-1">MP4, MOV, AVI, MKV</div>
          </div>
        </div>

        <LcarsButton variant="primary" size="lg" disabled={disabled}>
          <Upload className="w-5 h-5" />
          <span>SELECT FILES</span>
        </LcarsButton>

        <div className="flex items-center justify-center mt-4 text-cyan-500">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span className="data-font text-sm">MAXIMUM FILE SIZE: {maxSize}</span>
        </div>
      </motion.div>
    </div>
  );
}