import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function TranscriptionPreview({
  transcription,
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
                {transcription.title}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {transcription.source_file_name}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0" aria-label="Close preview">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 flex justify-between">
            <div className="text-xs">
              <span className="font-medium">Integrated On:</span>
              <div className="text-muted-foreground">
                {new Date(transcription.updated_date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-xs">
              <span className="font-medium">Purpose:</span>
              <div className="text-muted-foreground">
                {transcription.purpose}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-2">Key Topics</div>
            <div className="flex flex-wrap gap-1">
              {transcription.key_topics?.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {(transcription.key_topics || []).length === 0 && <span className="text-xs text-muted-foreground">N/A</span>}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-2">Highlights</div>
            <div className="relative">
              <div className="prose dark:prose-invert text-xs max-w-none text-muted-foreground bg-muted/30 p-2 rounded max-h-32 overflow-y-auto prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {transcription.highlights || "No highlights available."}
                </ReactMarkdown>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            </div>
          </div>
          
          {/* MODIFIED: Wrap buttons in TooltipProvider */}
          <TooltipProvider>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 py-[18px]"
                onClick={onExpand}
              >
                <SquareArrowOutUpRight className="h-4 w-4 mr-1" />
                Preview
              </Button>

              {/* Delete Button with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onDelete}
                    aria-label="Delete transcription"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Transcription</p>
                </TooltipContent>
              </Tooltip>

              {/* Move Button with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onMove}
                    aria-label="Move to folder"
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move to Folder</p>
                </TooltipContent>
              </Tooltip>

              {/* Download Button with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onDownload}
                    aria-label="Download as text file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download .txt</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

        </CardContent>
      </Card>
    </div>
  );
}