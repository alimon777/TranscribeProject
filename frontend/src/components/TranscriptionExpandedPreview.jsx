import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import StatusBadge from './StatusBadge';
import { Badge } from '@/components/ui/badge';

export default function TranscriptionExpandedPreview({
  transcription,
  folderName,
  isOpen,
  onClose,
}) {
  if (!transcription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex gap-3">
            <span>{transcription.session_title}</span>
            <StatusBadge status={transcription.status} />
          </DialogTitle>
          <DialogDescription className="flex flex-wrap">
            <span>
              {folderName} • {transcription.source_file_name} • Processed on{' '}
              {new Date(transcription.processed_at).toLocaleDateString()} •{' '}
            </span>
            <div className="ml-1 flex flex-wrap gap-1">
              {transcription.topics?.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="w-full overflow-hidden flex flex-grow">
          <div className="w-full flex overflow-auto pr-1 gap-4 flex-grow">
            <div className="w-full">
              <h3 className="pl-2 text-lg font-semibold mb-3">Content</h3>
              <div className="prose prose-sm max-w-none h-[calc(100%-40px)] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/30 p-4 rounded h-full">
                  {transcription.cleaned_transcript_text}
                </pre>
              </div>
            </div>
            {transcription.quiz_content && (
              <div className="w-full">
                <h3 className="pl-2 text-lg font-semibold mb-3">
                  Generated Quiz
                </h3>
                <div className="prose prose-sm max-w-none h-[calc(100%-40px)] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/30 p-4 rounded h-full">
                    {transcription.quiz_content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}