import React from 'react';
import { motion } from 'framer-motion';
import LcarsLayout from '../components/layout/LcarsLayout';
import FileUploader from '../components/upload/FileUploader';
import LcarsPanel from '../components/ui/LcarsPanel';
import { useTranscriptions } from '../hooks/useTranscriptions';
import { Clock, FileAudio, Cpu } from 'lucide-react';

export default function UploadPage() {
  const { data: transcriptionsData, isLoading } = useTranscriptions(1, 5);
  const recentTranscriptions = transcriptionsData?.data?.transcriptions || [];

  const handleUploadComplete = (transcriptionId: string) => {
    // You could navigate to the transcription detail page here
    console.log('Upload completed:', transcriptionId);
  };

  return (
    <LcarsLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-lcars-orange mb-2">
            Audio Transcription
          </h1>
          <p className="text-lcars-blue text-lg uppercase tracking-wider">
            Advanced Linguistic Analysis
          </p>
          <div className="w-48 h-1 bg-[var(--lcars-orange)] mx-auto mt-4"></div>
        </div>

        {/* Main Upload Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Upload Section */}
          <div className="lg:col-span-2">
            <FileUploader onUploadComplete={handleUploadComplete} />
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            {/* System Specifications */}
            <LcarsPanel title="System Specs" variant="highlight">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileAudio className="w-5 h-5 text-lcars-blue" />
                  <div>
                    <p className="text-lcars-white text-sm font-medium">Supported Formats</p>
                    <p className="text-lcars-grey text-xs">MP3, WAV, M4A, FLAC, OGG, MP4, AVI, MOV, MKV</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-lcars-blue" />
                  <div>
                    <p className="text-lcars-white text-sm font-medium">Processing Time</p>
                    <p className="text-lcars-grey text-xs">~1-3 minutes per hour of audio</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-lcars-blue" />
                  <div>
                    <p className="text-lcars-white text-sm font-medium">AI Engine</p>
                    <p className="text-lcars-grey text-xs">Deepseek + Gemini Enhanced</p>
                  </div>
                </div>
              </div>
            </LcarsPanel>

            {/* Recent Activity */}
            {recentTranscriptions.length > 0 && (
              <LcarsPanel title="Recent Files" variant="default">
                <div className="space-y-3">
                  {recentTranscriptions.slice(0, 3).map((transcription: any) => (
                    <div key={transcription.id} className="flex items-center justify-between py-2 border-b border-[var(--lcars-burnt-orange)] last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-lcars-white text-sm font-medium truncate">
                          {transcription.original_filename}
                        </p>
                        <p className="text-lcars-grey text-xs">
                          {new Date(transcription.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`lcars-status ${transcription.status.toLowerCase()}`}>
                        {transcription.status}
                      </div>
                    </div>
                  ))}
                  
                  {recentTranscriptions.length > 3 && (
                    <div className="text-center pt-2">
                      <button className="text-lcars-blue hover:text-lcars-orange text-xs uppercase tracking-wider">
                        View All History
                      </button>
                    </div>
                  )}
                </div>
              </LcarsPanel>
            )}

            {/* System Performance */}
            <LcarsPanel title="Performance" variant="default">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lcars-blue text-sm uppercase tracking-wider">CPU Usage</span>
                  <span className="text-lcars-orange text-sm font-bold">23%</span>
                </div>
                <div className="w-full bg-[var(--lcars-panel-black)] rounded-full h-2">
                  <div className="bg-[var(--lcars-green)] h-2 rounded-full" style={{ width: '23%' }}></div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <span className="text-lcars-blue text-sm uppercase tracking-wider">Memory</span>
                  <span className="text-lcars-orange text-sm font-bold">41%</span>
                </div>
                <div className="w-full bg-[var(--lcars-panel-black)] rounded-full h-2">
                  <div className="bg-[var(--lcars-orange)] h-2 rounded-full" style={{ width: '41%' }}></div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <span className="text-lcars-blue text-sm uppercase tracking-wider">Queue Status</span>
                  <span className="text-lcars-green text-sm font-bold">Optimal</span>
                </div>
              </div>
            </LcarsPanel>
          </div>
        </div>
      </motion.div>
    </LcarsLayout>
  );
}