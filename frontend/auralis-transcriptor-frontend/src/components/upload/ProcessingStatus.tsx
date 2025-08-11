import React from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Loader2, 
  FileAudio, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import type { Transcription } from '../../types';
import { formatDuration } from '../../utils';

const statusConfig = {
  UPLOADED: {
    icon: Upload,
    label: "UPLOAD COMPLETE",
    description: "File received and queued for processing",
    color: "text-blue-400"
  },
  PROCESSING: {
    icon: FileAudio,
    label: "AUDIO EXTRACTION",
    description: "Extracting and optimizing audio stream",
    color: "text-yellow-400"
  },
  TRANSCRIBING: {
    icon: MessageSquare,
    label: "NEURAL TRANSCRIPTION",
    description: "Converting speech to text using AI",
    color: "text-cyan-400"
  },
  COMPLETED: {
    icon: CheckCircle,
    label: "TRANSCRIPTION COMPLETE",
    description: "Ready for analysis and export",
    color: "text-green-400"
  },
  FAILED: {
    icon: AlertTriangle,
    label: "PROCESSING ERROR",
    description: "Unable to complete transcription",
    color: "text-red-400"
  }
};

interface ProcessingStatusProps {
  transcription: Transcription;
}

export default function ProcessingStatus({ transcription }: ProcessingStatusProps) {
  const config = statusConfig[transcription.status] || statusConfig.UPLOADED;
  const IconComponent = config.icon;
  const isProcessing = ['PROCESSING', 'TRANSCRIBING'].includes(transcription.status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="lcars-panel rounded-lg p-6"
    >
      <div className="flex items-start space-x-6">
        <div className={`p-4 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 ${config.color}`}>
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <IconComponent className="w-8 h-8" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className={`lcars-font text-lg font-semibold ${config.color}`}>
              {config.label}
            </h3>
            {isProcessing && (
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-cyan-400 rounded-full"
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1, 0.8]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="text-cyan-200 mb-4">{config.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="data-font text-xs text-cyan-500 mb-1">FILENAME</div>
              <div className="data-font text-sm text-white truncate">{transcription.original_filename}</div>
            </div>
            {transcription.duration_seconds && (
              <div>
                <div className="data-font text-xs text-cyan-500 mb-1">DURATION</div>
                <div className="data-font text-sm text-white">
                  {formatDuration(transcription.duration_seconds)}
                </div>
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="data-font text-cyan-400">PROCESSING</span>
                <span className="data-font text-cyan-400">◆ ◆ ◆</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  animate={{
                    x: ['-100%', '100%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}