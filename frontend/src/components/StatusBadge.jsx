import React from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TRANSCRIPTION_STATUSES } from '../../src/mockData';

export default function StatusBadge ({ status }) {
  switch (status) {
    case TRANSCRIPTION_STATUSES.DRAFT:
      return (
        <Badge
          variant="outline"
          className="text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30"
        >
          Draft
        </Badge>
      );
    case TRANSCRIPTION_STATUSES.INTEGRATED:
      return (
        <Badge
          variant="default"
          className="text-green-600 border-green-500 bg-green-50 dark:bg-green-900/30"
        >
          Integrated
        </Badge>
      );
    case TRANSCRIPTION_STATUSES.PROCESSING:
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        >
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};