export const SESSION_PURPOSES = [
  "General Walkthrough/Overview",
  "Requirements Gathering",
  "Technical Deep Dive",
  "Meeting Minutes",
  "Training Session",
  "Product Demo",
  "User Stories"
];

// A map of status constants for consistency and to avoid typos.
export const TRANSCRIPTION_STATUSES = {
  DRAFT: "Draft",
  INTEGRATED: "Integrated",
  ARCHIVED: "Archived",
  PROCESSING: "Processing",
  AWAITING_APPROVAL: "Awaiting Approval", 
  ERROR: "Error",
  FINALIZING: "Checking for Conflicts",
};


export const ANOMALY_TYPES = {
  SEMANTIC_DIFFERENCE: "SEMANTIC_DIFFERENCE",
  OVERLAP: "OVERLAP",
  CONTRADICTION: "CONTRADICTION",
  OUTDATED_INFO: "OUTDATED_INFO",
};

export const CONFLICT_STATUSES = {
  PENDING: "Pending Review",
  RESOLVED_MERGED: "Resolved (Merged)",
  REJECTED: "Rejected",
};