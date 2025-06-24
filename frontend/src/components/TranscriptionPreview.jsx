import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  XCircle,
  SquareArrowOutUpRight,
  Trash2,
  Move,
  Download,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { Badge } from '@/components/ui/badge';

export default function TranscriptionPreview({
  transcription,
  folderName,
  onClose,
  onExpand,
  onDelete,
  onMove,
  onDownload,
}) {
  return (
    <div className="w-80 space-y-3">
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight">
                {transcription.session_title}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {transcription.source_file_name}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 flex justify-between">
            <div className="text-xs">
              <span className="font-medium">Date Processed:</span>
              <div className="text-muted-foreground">
                {new Date(transcription.processed_at).toLocaleDateString()}
              </div>
            </div>
            <div className="text-xs">
              <span className="font-medium">Purpose:</span>
              <div className="text-muted-foreground">
                {transcription.session_purpose}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-2">Key Topics</div>
            <div className="flex flex-wrap gap-1">
              {transcription.topics?.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="text-xs font-medium mb-1">Status :</div>
            <StatusBadge status={transcription.status} />
          </div>
          <div>
            <div className="text-xs font-medium mb-2">Content</div>
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded text-left max-h-32 overflow-y-auto">
              {transcription.cleaned_transcript_text?.substring(0, 200)}...
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onExpand}
            >
              <SquareArrowOutUpRight className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onMove}
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}