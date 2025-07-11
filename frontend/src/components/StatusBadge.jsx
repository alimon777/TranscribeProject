// StatusBadge.js (Updated)

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  TRANSCRIPTION_STATUSES, 
  // LOCAL_ANOMALY_TYPES, 
  LOCAL_CONFLICT_STATUSES 
} from '@/lib/constants';

export default function StatusBadge({ status }) {
  const getStatusProps = () => {
    const chipBaseStyle = "text-[10px] py-0.5 px-1.5 rounded-full border-0 font-medium";

    switch (status) {
      // Original Transcription Statuses
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
      case TRANSCRIPTION_STATUSES.FINALIZING:
        return {
          variant: "secondary",
          className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
          text: "Integration InProcess",
          icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
        };
      
      // NEW: Anomaly Types for Admin Dashboard
      case "SEMANTIC_DIFFERENCE":
        return {
          variant: "secondary",
          className: `${chipBaseStyle} bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300`,
          text: status,
        };
      case "OVERLAP":
        return {
          variant: "secondary",
          className: `${chipBaseStyle} bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300`,
          text: status,
        };
      case "CONTRADICTION":
      case "OUTDATED_INFO":
        return {
          variant: "secondary",
          className: `${chipBaseStyle} bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300`,
          text: status,
        };
      
      // NEW: Conflict Statuses for Admin Dashboard
      case LOCAL_CONFLICT_STATUSES.PENDING:
         return {
          variant: "secondary",
          className: `${chipBaseStyle} bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300`,
          text: status,
        };
      case LOCAL_CONFLICT_STATUSES.RESOLVED_MERGED:
        return {
          variant: "secondary",
          className: `${chipBaseStyle} bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300`,
          text: status,
        };
      case LOCAL_CONFLICT_STATUSES.REJECTED:
        return {
          variant: "secondary",
          className: `${chipBaseStyle} bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300`,
          text: status,
        };

      // Fallback for any unknown status
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