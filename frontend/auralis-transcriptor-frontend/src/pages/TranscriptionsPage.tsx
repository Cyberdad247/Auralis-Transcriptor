import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl, formatFileSize, formatDuration } from '../utils';
import { format } from 'date-fns';
import { 
  Upload, 
  FileText, 
  Download, 
  Eye,
  FileAudio,
  FileVideo,
  Trash2
} from 'lucide-react';
import { useTranscriptions, useDeleteTranscription } from '../hooks/useTranscriptions';
import Layout from '../components/layout/Layout';
import LcarsPanel from '../components/ui/LcarsPanel';
import LcarsButton from '../components/ui/LcarsButton';
import type { Transcription } from '../types';

const statusStyles = {
  UPLOADED: { color: "text-blue-400", bg: "bg-blue-400/20" },
  PROCESSING: { color: "text-yellow-400", bg: "bg-yellow-400/20" },
  TRANSCRIBING: { color: "text-cyan-400", bg: "bg-cyan-400/20" },
  COMPLETED: { color: "text-green-400", bg: "bg-green-400/20" },
  FAILED: { color: "text-red-400", bg: "bg-red-400/20" }
};

export default function TranscriptionsPage() {
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);
  const { data: transcriptionsResponse, isLoading, error } = useTranscriptions();
  const deleteMutation = useDeleteTranscription();
  
  // Extract transcriptions array from the response
  const transcriptions = Array.isArray(transcriptionsResponse) 
    ? transcriptionsResponse 
    : transcriptionsResponse?.data?.transcriptions || [];

  const downloadTranscript = (transcription: Transcription, format: 'txt' | 'md') => {
    if (!transcription.transcript_text) return;

    const content = format === 'md' 
      ? `# ${transcription.original_filename}\n\n${transcription.transcript_text}`
      : transcription.transcript_text;
    
    const blob = new Blob([content], { 
      type: format === 'md' ? 'text/markdown' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.original_filename.replace(/\.[^/.]+$/, '')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (transcription: Transcription) => {
    if (window.confirm(`Delete transcription "${transcription.original_filename}"?`)) {
      await deleteMutation.mutateAsync(transcription.id);
      if (selectedTranscription?.id === transcription.id) {
        setSelectedTranscription(null);
      }
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType?.includes('video')) return FileVideo;
    return FileAudio;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="lcars-font text-3xl font-bold text-cyan-300">TRANSCRIPTION ARCHIVE</h1>
              <p className="data-font text-cyan-500">
                {transcriptions.length} NEURAL TRANSCRIPTION RECORDS
              </p>
            </div>
            
            <Link to={createPageUrl("Upload")}>
              <LcarsButton variant="primary" size="lg">
                <Upload className="w-5 h-5" />
                <span>NEW TRANSCRIPTION</span>
              </LcarsButton>
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Transcriptions List */}
            <div className="lg:col-span-2">
              <LcarsPanel title="ARCHIVED TRANSCRIPTIONS">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="data-font text-cyan-400">ACCESSING NEURAL ARCHIVE...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="data-font text-red-400">Error loading transcriptions</p>
                  </div>
                ) : transcriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-cyan-400/50 mx-auto mb-4" />
                    <h3 className="lcars-font text-xl text-cyan-300 mb-2">NO TRANSCRIPTIONS FOUND</h3>
                    <p className="text-cyan-400 mb-6">Upload your first audio or video file to begin</p>
                    <Link to={createPageUrl("Upload")}>
                      <LcarsButton variant="primary">
                        <Upload className="w-4 h-4" />
                        <span>START TRANSCRIPTION</span>
                      </LcarsButton>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {transcriptions.map((transcription) => {
                        const FileIcon = getFileIcon(transcription.file_type);
                        const statusStyle = statusStyles[transcription.status] || statusStyles.UPLOADED;
                        
                        return (
                          <motion.div
                            key={transcription.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`lcars-panel rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                              selectedTranscription?.id === transcription.id 
                                ? 'border-cyan-400 bg-cyan-400/10' 
                                : 'hover:border-cyan-400/50'
                            }`}
                            onClick={() => setSelectedTranscription(transcription)}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800">
                                <FileIcon className="w-6 h-6 text-cyan-400" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                  <h3 className="lcars-font font-semibold text-white truncate">
                                    {transcription.original_filename}
                                  </h3>
                                  <div className={`px-2 py-1 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.color}`}>
                                    {transcription.status}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="data-font text-cyan-500">SIZE: </span>
                                    <span className="data-font text-cyan-200">
                                      {formatFileSize(transcription.file_size)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="data-font text-cyan-500">DURATION: </span>
                                    <span className="data-font text-cyan-200">
                                      {formatDuration(transcription.duration_seconds)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="data-font text-cyan-500">DATE: </span>
                                    <span className="data-font text-cyan-200">
                                      {format(new Date(transcription.created_at), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {transcription.status === 'COMPLETED' && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadTranscript(transcription, 'txt');
                                      }}
                                      className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                                      title="Download as TXT"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadTranscript(transcription, 'md');
                                      }}
                                      className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                                      title="Download as Markdown"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(transcription);
                                  }}
                                  className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                  title="Delete transcription"
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <Eye className="w-4 h-4 text-cyan-400" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </LcarsPanel>
            </div>

            {/* Details Panel */}
            <div className="space-y-6">
              <LcarsPanel title="TRANSCRIPTION DETAILS">
                {selectedTranscription ? (
                  <div className="space-y-4">
                    <div>
                      <div className="data-font text-xs text-cyan-500 mb-1">FILENAME</div>
                      <div className="data-font text-sm text-white">
                        {selectedTranscription.original_filename}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="data-font text-xs text-cyan-500 mb-1">STATUS</div>
                        <div className={`data-font text-sm ${
                          statusStyles[selectedTranscription.status]?.color || 'text-white'
                        }`}>
                          {selectedTranscription.status}
                        </div>
                      </div>
                      <div>
                        <div className="data-font text-xs text-cyan-500 mb-1">FILE SIZE</div>
                        <div className="data-font text-sm text-white">
                          {formatFileSize(selectedTranscription.file_size)}
                        </div>
                      </div>
                    </div>
                    
                    {selectedTranscription.duration_seconds && (
                      <div>
                        <div className="data-font text-xs text-cyan-500 mb-1">DURATION</div>
                        <div className="data-font text-sm text-white">
                          {formatDuration(selectedTranscription.duration_seconds)}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div className="data-font text-xs text-cyan-500 mb-1">UPLOADED</div>
                      <div className="data-font text-sm text-white">
                        {format(new Date(selectedTranscription.created_at), 'PPpp')}
                      </div>
                    </div>
                    
                    {selectedTranscription.transcript_text && (
                      <div>
                        <div className="data-font text-xs text-cyan-500 mb-2">TRANSCRIPT PREVIEW</div>
                        <div className="bg-black/30 rounded-lg p-3 border border-cyan-400/20 max-h-40 overflow-y-auto">
                          <div className="data-font text-xs text-cyan-100 leading-relaxed">
                            {selectedTranscription.transcript_text.substring(0, 200)}
                            {selectedTranscription.transcript_text.length > 200 && '...'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 text-cyan-400/50 mx-auto mb-3" />
                    <p className="data-font text-cyan-400 text-sm">SELECT A TRANSCRIPTION TO VIEW DETAILS</p>
                  </div>
                )}
              </LcarsPanel>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}