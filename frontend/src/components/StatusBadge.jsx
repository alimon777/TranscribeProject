import React from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// A map of status constants for consistency and to avoid typos.
export const TRANSCRIPTION_STATUSES = {
  DRAFT: "Draft",
  INTEGRATED: "Integrated",
  ARCHIVED: "Archived",
  PROCESSING: "Processing",
  AWAITING_APPROVAL: "Awaiting Approval", // Changed key for clarity
  ERROR: "Error",
};

export default function StatusBadge({ status }) {
  // A helper function could also be used here to map status to styles
  const getStatusProps = () => {
    switch (status) {
      case TRANSCRIPTION_STATUSES.DRAFT:
        return {
          variant: "outline",
          className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30",
          text: "Draft",
        };
      case TRANSCRIPTION_STATUSES.INTEGRATED:
        return {
          variant: "default",
          className: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30",
          text: "Integrated",
        };
      case TRANSCRIPTION_STATUSES.PROCESSING:
        return {
          variant: "secondary",
          className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
          text: "Processing",
          icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
        };
      case TRANSCRIPTION_STATUSES.AWAITING_APPROVAL:
        return {
          variant: "secondary",
          className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
          text: "Awaiting Approval",
        };
      case TRANSCRIPTION_STATUSES.ERROR:
        return {
          variant: "secondary",
          className: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30",
          text: "Conflicts Found",
        };
      default:
        return {
          variant: "secondary",
          text: status,
        };
    }
  };

  const { variant, className, text, icon } = getStatusProps();

  return (
    <Badge variant={variant} className={className}>
      {icon}
      {text}
    </Badge>
  );
};