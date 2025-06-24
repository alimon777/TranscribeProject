// src/mockData.js

// --- Constants for enum-like fields ---
export const SESSION_PURPOSES = [
  "General Walkthrough/Overview",
  "Requirements Gathering",
  "Technical Deep Dive",
  "Meeting Minutes",
  "Training Session",
  "Product Demo",
];

export const TRANSCRIPTION_STATUSES = {
  DRAFT: "Draft",
  INTEGRATED: "Integrated",
  ARCHIVED: "Archived",
  PROCESSING: "Processing", 
  ERROR: "Error",
};

export const ANOMALY_TYPES = {
  CONTRADICTION: "Contradiction",
  OVERLAP: "Significant Overlap",
  SEMANTIC_DIFFERENCE: "Semantic Difference",
  OUTDATED_INFO: "Outdated Information",
};

export const CONFLICT_STATUSES = {
  PENDING: "Pending Review",
  RESOLVED_ACCEPTED_NEW: "Resolved (Accepted New)",
  RESOLVED_RETAINED_EXISTING: "Resolved (Retained Existing)",
  RESOLVED_MERGED: "Resolved (Merged)",
  REJECTED_NEW: "Rejected (New Content)",
};

// --- Mock Data Tables ---
export let mockTopics = [ 
  { id: "topic_1", name: "CRM", created_at: "2023-10-01T10:00:00Z" },
  { id: "topic_2", name: "Architecture", created_at: "2023-10-01T10:05:00Z" },
  { id: "topic_3", name: "Planning", created_at: "2023-10-01T10:10:00Z" },
  { id: "topic_4", name: "API", created_at: "2023-10-02T11:00:00Z" },
  { id: "topic_5", name: "Design", created_at: "2023-10-02T11:05:00Z" },
  { id: "topic_6", name: "Microservices", created_at: "2023-10-02T11:10:00Z" },
  { id: "topic_7", name: "Progress", created_at: "2023-10-03T12:00:00Z" },
  { id: "topic_8", name: "Blockers", created_at: "2023-10-03T12:05:00Z" },
  { id: "topic_9", name: "Updates", created_at: "2023-10-03T12:10:00Z" },
  { id: "topic_10", name: "Onboarding", created_at: "2023-10-04T13:00:00Z" },
  { id: "topic_11", name: "Processes", created_at: "2023-10-04T13:05:00Z" },
  { id: "topic_12", name: "HR", created_at: "2023-10-04T13:10:00Z" },
];

export let mockFolders = [
  // Note: we include a direct "count" key here for each folder.
  { id: "all", name: "All Transcriptions", parent_id: null, created_at: "2023-01-01T00:00:00Z", updated_at: "2023-01-01T00:00:00Z", count: 4 },
  { id: "folder_proj", name: "Projects", parent_id: null, created_at: "2023-01-10T09:00:00Z", updated_at: "2023-01-10T09:00:00Z", count: 2 },
  { id: "folder_proj_phoenix", name: "Project Phoenix", parent_id: "folder_proj", created_at: "2023-01-10T09:01:00Z", updated_at: "2024-01-15T10:30:00Z", count: 1 },
  { id: "folder_proj_crm", name: "CRM Enhancement", parent_id: "folder_proj", created_at: "2023-01-10T09:02:00Z", updated_at: "2024-01-14T11:45:00Z", count: 1 },
  { id: "folder_meetings", name: "Meetings", parent_id: null, created_at: "2023-01-11T10:00:00Z", updated_at: "2024-01-13T14:20:00Z", count: 1 },
  { id: "folder_training", name: "Training Sessions", parent_id: null, created_at: "2023-01-12T11:00:00Z", updated_at: "2024-01-12T15:00:00Z", count: 1 },
];

export let mockTranscriptions = [
  {
    id: "trans_1",
    folder_id: "folder_proj_phoenix",
    session_title: "Q3 Project Phoenix Planning",
    source_file_name: "phoenix-planning-q3.mp4",
    session_purpose: SESSION_PURPOSES[1],
    status: TRANSCRIPTION_STATUSES.INTEGRATED,
    cleaned_transcript_text: "### Q3 Project Phoenix Planning Session\n\nMeeting Overview...",
    quiz_content: "### Quiz: What are the phases?",
    processing_time_seconds: 154,
    topic_ids: ["topic_1", "topic_2", "topic_3"],
    uploaded_at: "2024-01-15T09:00:00Z",
    processed_at: "2024-01-15T09:02:34Z",
    integrated_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  },
  {
    id: "trans_2",
    folder_id: "folder_proj_crm",
    session_title: "API Design Walkthrough v2",
    source_file_name: "api-design-v2.wav",
    session_purpose: SESSION_PURPOSES[2],
    status: TRANSCRIPTION_STATUSES.DRAFT,
    cleaned_transcript_text: "### API Design Walkthrough v2\n\nUpdated API design specs...",
    quiz_content: null,
    processing_time_seconds: 95,
    topic_ids: ["topic_4", "topic_5", "topic_6"],
    uploaded_at: "2024-01-14T10:00:00Z",
    processed_at: "2024-01-14T10:01:35Z",
    integrated_at: null,
    updated_at: "2024-01-14T11:45:00Z",
  },
  {
    id: "trans_3",
    folder_id: "folder_meetings",
    session_title: "Weekly Team Standup - Jan 13",
    source_file_name: "standup-jan-13.m4a",
    session_purpose: SESSION_PURPOSES[3],
    status: TRANSCRIPTION_STATUSES.INTEGRATED,
    cleaned_transcript_text: "### Weekly Standup\n\nAttendees: Alice, Bob, Charlie...",
    quiz_content: null,
    processing_time_seconds: 60,
    topic_ids: ["topic_7", "topic_8", "topic_9"],
    uploaded_at: "2024-01-13T14:00:00Z",
    processed_at: "2024-01-13T14:01:00Z",
    integrated_at: "2024-01-13T14:20:00Z",
    updated_at: "2024-01-13T14:20:00Z",
  },
  {
    id: "trans_4",
    folder_id: "folder_training",
    session_title: "New Employee Onboarding - Session 1",
    source_file_name: "onboarding-session1.mp4",
    session_purpose: SESSION_PURPOSES[4],
    status: TRANSCRIPTION_STATUSES.ARCHIVED,
    cleaned_transcript_text: "### Onboarding Session\n\nWelcome to the team...",
    quiz_content: "### Onboarding Quiz\n\nWhere to find company info?",
    processing_time_seconds: 180,
    topic_ids: ["topic_10", "topic_11", "topic_12"],
    uploaded_at: "2024-01-12T14:00:00Z",
    processed_at: "2024-01-12T14:03:00Z",
    integrated_at: "2024-01-12T14:30:00Z",
    updated_at: "2024-01-12T15:00:00Z",
  },
];

export let mockAdminConflicts = [
  {
    id: "conflict_1",
    new_transcription_id: "trans_1",
    existing_kb_document_id: "KB_DOC_CRM_STRATEGY_V2",
    new_content_snippet: "AWS should be prioritized...",
    existing_content_snippet: "Microsoft Azure is preferred...",
    anomaly_type: ANOMALY_TYPES.CONTRADICTION,
    status: CONFLICT_STATUSES.PENDING,
    flagged_at: "2024-01-15T10:35:00Z",
    resolved_at: null,
    resolution_notes: null,
  },
  {
    id: "conflict_2",
    new_transcription_id: "trans_2",
    existing_kb_document_id: "KB_DOC_PROJECT_MGMT_BP",
    new_content_snippet: "Requirements gathering needs interviews...",
    existing_content_snippet: "Stakeholder interviews and workshops...",
    anomaly_type: ANOMALY_TYPES.SEMANTIC_DIFFERENCE,
    status: CONFLICT_STATUSES.PENDING,
    flagged_at: "2024-01-14T11:50:00Z",
    resolved_at: null,
    resolution_notes: null,
  },
  {
    id: "conflict_3",
    new_transcription_id: "trans_4",
    existing_kb_document_id: "KB_DOC_DATA_PRIVACY_GUIDE",
    new_content_snippet: "GDPR requires data minimization...",
    existing_content_snippet: "Data minimization should be followed...",
    anomaly_type: ANOMALY_TYPES.OVERLAP,
    status: CONFLICT_STATUSES.RESOLVED_MERGED,
    flagged_at: "2024-01-13T09:00:00Z",
    resolved_at: "2024-01-13T15:00:00Z",
    resolution_notes: "Merged new snippets into existing content.",
  },
];

const MOCK_API_DELAY = 500;

// --- Folder Helper Functions ---
const getFolderPathRecursive = (folderId, allFoldersMap, pathArray = []) => {
  const folder = allFoldersMap.get(folderId);
  if (!folder) return pathArray;
  pathArray.unshift(folder.name);
  if (folder.parent_id && allFoldersMap.has(folder.parent_id) && folder.parent_id !== "all") {
    return getFolderPathRecursive(folder.parent_id, allFoldersMap, pathArray);
  }
  return pathArray;
};

const countTranscriptionsInBranch = (targetFolderId, allFolders, allTranscriptionsInRepo) => {
  if (targetFolderId === "all") {
    return allTranscriptionsInRepo.filter(t =>
      t.status !== TRANSCRIPTION_STATUSES.DRAFT &&
      t.status !== TRANSCRIPTION_STATUSES.ARCHIVED
    ).length;
  }
  const folderIdsToCount = [targetFolderId];
  // For simplicity, assume provided "count" in folder data is correct.
  return allTranscriptionsInRepo.filter(t => folderIdsToCount.includes(t.folder_id)).length;
};

export const getMockRepositoryData = () => {
  const foldersMap = new Map(mockFolders.map(f => [f.id, { ...f }]));
  const foldersWithDetails = mockFolders.map(folder => {
    let pathStr = "";
    if (folder.id !== "all") {
      const pathArr = getFolderPathRecursive(folder.id, foldersMap);
      pathStr = pathArr.join(" / ");
    } else {
      pathStr = folder.name;
    }
    return { ...folder, path: pathStr };
  });
  const transcriptionsWithTopics = mockTranscriptions.map(t => ({
    ...t,
    topics: (t.topic_ids || []).map(tid => {
      const topic = mockTopics.find(topic => topic.id === tid);
      return topic ? topic.name : null;
    }).filter(Boolean)
  }));
  return {
    folders: foldersWithDetails,
    transcriptions: transcriptionsWithTopics,
  };
};

export const mockUploadAndProcess = (fileInfo, metadata) => {
  const newTranscriptionId = `trans_${Date.now()}`;
  const processingTimeSec = Math.floor(Math.random() * 120) + 60;
  let generatedContent = `### ${metadata.sessionTitle || "Untitled Session"}\n\nSession Purpose: ${metadata.sessionPurpose}\nTopics: ${metadata.primaryTopic}\n\n`;
  if (metadata.keywords) {
    generatedContent += `Keywords mentioned: ${metadata.keywords.split('\n').join(', ')}\n\n`;
  }
  generatedContent += `This is a mock transcription based on the provided metadata.`;
  let generatedQuizText = null;
  if (metadata.generateQuiz) {
    generatedQuizText = `### Quiz for ${metadata.sessionTitle || "Untitled Session"}\n\n1. What was the main purpose of this session?`;
  }
  const processedDataForReview = {
    _temp_id: newTranscriptionId,
    sessionInfo: {
      title: metadata.sessionTitle || "Untitled Session",
      purpose: metadata.sessionPurpose,
      domain: metadata.primaryTopic,
      processingTime: `${Math.floor(processingTimeSec / 60)} minutes ${processingTimeSec % 60} seconds`,
    },
    cleanedTranscription: generatedContent,
    generatedQuiz: generatedQuizText,
    generateQuiz: metadata.generateQuiz,
    knowledgeBaseIntegration: {
      suggestionText: `This content seems related to '${metadata.primaryTopic || 'General Topics'}'. Consider placing it there.`,
      proposedLocation: metadata.primaryTopic
        ? [metadata.primaryTopic.split(',')[0]?.trim(), metadata.sessionTitle || "New Session"].filter(Boolean)
        : ["General", metadata.sessionTitle || "New Session"].filter(Boolean)
    },
    _raw_metadata: metadata,
    _raw_file_info: fileInfo,
    _raw_processing_time_seconds: processingTimeSec,
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(processedDataForReview);
    }, MOCK_API_DELAY);
  });
};

export const mockFetchRepository = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getMockRepositoryData());
    }, MOCK_API_DELAY / 2);
  });
};

export const mockFetchAdminConflicts = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const conflictsWithContext = mockAdminConflicts.map(conflict => {
        const newTranscription = mockTranscriptions.find(t => t.id === conflict.new_transcription_id);
        return {
          ...conflict,
          new_transcription_title: newTranscription?.session_title || "Unknown Transcription",
        };
      });
      resolve(conflictsWithContext);
    }, MOCK_API_DELAY / 2);
  });
};

const saveTranscriptionToMockDB = (dataToSave, status, folderId) => {
  const now = new Date().toISOString();
  const newTranscription = {
    id: dataToSave._temp_id || `trans_${Date.now()}`,
    folder_id: folderId,
    session_title: dataToSave.sessionInfo.title,
    source_file_name: dataToSave._raw_file_info?.name || "unknown_file",
    session_purpose: dataToSave.sessionInfo.purpose,
    status: status,
    cleaned_transcript_text: dataToSave.cleanedTranscription,
    quiz_content: dataToSave.generatedQuiz,
    processing_time_seconds: dataToSave._raw_processing_time_seconds,
    topic_ids: dataToSave.sessionInfo.domain ? 
      dataToSave.sessionInfo.domain.split(',')
        .map(name => {
          let topic = mockTopics.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
          if (!topic) {
            topic = { id: `topic_${Date.now()}_${Math.random().toString(36).substring(7)}`, name: name.trim(), created_at: now };
            mockTopics.push(topic);
          }
          return topic.id;
        })
      : [],
    uploaded_at: dataToSave._raw_metadata.uploadTime || now,
    processed_at: now,
    integrated_at: status === TRANSCRIPTION_STATUSES.INTEGRATED ? now : null,
    updated_at: now,
  };
  const existingIndex = mockTranscriptions.findIndex(t => t.id === newTranscription.id);
  if (existingIndex > -1) {
    mockTranscriptions[existingIndex] = newTranscription;
  } else {
    mockTranscriptions.push(newTranscription);
  }
  return newTranscription;
};

export const mockSaveAsDraft = (processedData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const draftFolder = mockFolders.find(f => f.name.toLowerCase() === "drafts");
      const targetFolderId = draftFolder ? draftFolder.id : null;
      const savedDraft = saveTranscriptionToMockDB(processedData, TRANSCRIPTION_STATUSES.DRAFT, targetFolderId);
      resolve({ success: true, message: "Content saved as draft.", draftId: savedDraft.id });
    }, MOCK_API_DELAY);
  });
};

export const mockFinalizeIntegration = (processedData, repositoryFolder) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const integratedTranscription = saveTranscriptionToMockDB(
        processedData,
        TRANSCRIPTION_STATUSES.INTEGRATED,
        repositoryFolder.id
      );
      if (Math.random() < 0.3) {
        const newConflict = {
          id: `conflict_${Date.now()}`,
          new_transcription_id: integratedTranscription.id,
          existing_kb_document_id: `KB_DOC_RANDOM_${Math.floor(Math.random() * 1000)}`,
          new_content_snippet: integratedTranscription.cleaned_transcript_text.substring(0, 100) + "...",
          existing_content_snippet: "Some pre-existing content in the knowledge base that might conflict...",
          anomaly_type: Object.values(ANOMALY_TYPES)[Math.floor(Math.random() * Object.values(ANOMALY_TYPES).length)],
          status: CONFLICT_STATUSES.PENDING,
          flagged_at: new Date().toISOString(),
          resolved_at: null,
          resolution_notes: null,
        };
        mockAdminConflicts.push(newConflict);
        resolve({
          success: true,
          message: `Content integrated into '${repositoryFolder.name}'. A potential conflict was flagged for admin review.`
        });
      } else {
        resolve({ success: true, message: `Content integrated and saved to '${repositoryFolder.name}'.` });
      }
    }, MOCK_API_DELAY);
  });
};

export const mockCreateFolder = async (name, parentId) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const newId = `folder_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newFolder = {
        id: newId,
        name,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        count: 0
      };
      mockFolders.push(newFolder);
      resolve(newFolder);
    }, MOCK_API_DELAY / 2);
  });
};

export const mockEditFolderName = async (folderId, newName) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const folderIndex = mockFolders.findIndex(f => f.id === folderId);
      if (folderIndex > -1 && folderId !== "all") {
        mockFolders[folderIndex].name = newName;
        mockFolders[folderIndex].updated_at = new Date().toISOString();
        resolve({ ...mockFolders[folderIndex] });
      } else if (folderId === "all") {
        reject({ message: "Cannot rename the root 'All Transcriptions' view." });
      } else {
        reject({ message: "Folder not found." });
      }
    }, MOCK_API_DELAY / 2);
  });
};

export const mockDeleteFolder = async (folderIdToDelete) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (folderIdToDelete === "all") {
        return reject({ message: "Cannot delete the root 'All Transcriptions' view." });
      }
      const folder = mockFolders.find(f => f.id === folderIdToDelete);
      if (!folder) return reject({ message: "Folder not found." });
      // For simplicity, assume that if count > 0, the folder has transcriptions.
      if (folder.count > 0) {
        return reject({ message: "Folder contains transcriptions. Cannot delete." });
      }
      mockFolders = mockFolders.filter(f => f.id !== folderIdToDelete);
      resolve({ success: true, message: "Folder(s) deleted successfully." });
    }, MOCK_API_DELAY / 2);
  });
};


// --- New APIs for individual conflict handling ---
export const mockFetchConflictDetail = (conflictId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const c = mockAdminConflicts.find((cf) => cf.id === conflictId);
      if (!c) return resolve(null);
      // Build detail: left = existing KB doc, right = new transcription
      resolve({
        id: c.id,
        status: c.status,
        pathLeft: [`KB Document`, c.existing_kb_document_id],
        pathRight: [`Transcription`, c.new_transcription_title],
        existingContent: c.existing_content_snippet,
        incomingContent: c.new_content_snippet,
        resolutionNotes: c.resolution_notes || '',
      });
    }, MOCK_API_DELAY / 2);
  });
};

export const mockResolveConflict = (conflictId, chosenContent) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const idx = mockAdminConflicts.findIndex((cf) => cf.id === conflictId);
      if (idx > -1) {
        mockAdminConflicts[idx].status = CONFLICT_STATUSES.RESOLVED_MERGED;
        mockAdminConflicts[idx].resolution_notes = chosenContent;
        mockAdminConflicts[idx].resolved_at = new Date().toISOString();
      }
      resolve({ success: true });
    }, MOCK_API_DELAY / 2);
  });
};


// ----------------------------------------------------------------
// Tree-View API built on top of the existing mocks
// ----------------------------------------------------------------
import { flatToNested } from './lib/tree-utils';

const addCountToFolders = (folderNodes) => {
  return folderNodes.map(folder => {
    const count = folder.count ?? 0;
    return {
      ...folder,
      count,
      children: folder.children ? addCountToFolders(folder.children) : [],
    };
  });
};

export function getFolderTreeData() {
  const nested = flatToNested(mockFolders);
  return addCountToFolders(nested);
}

export const treeApi = {
  addFolder: async (parentId, name, proposedId) => {
    console.log(`TreeAPI.addFolder("${name}") under parent ${parentId}`);
    await new Promise(r => setTimeout(r, 500));
    if (name.toLowerCase().includes('fail')) {
      return { success: false };
    }
    const finalId = `srv_${Date.now()}`;
    mockFolders.push({
      id: finalId,
      name,
      parent_id: parentId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      count: 0
    });
    return { success: true, finalId };
  },
  renameFolder: async (id, newName) => {
    console.log(`TreeAPI.renameFolder(${id} → "${newName}")`);
    await new Promise(r => setTimeout(r, 500));
    const idx = mockFolders.findIndex(f => f.id === id);
    if (idx < 0) return false;
    mockFolders[idx].name = newName;
    mockFolders[idx].updated_at = new Date().toISOString();
    return true;
  },
  deleteFolder: async (id) => {
    console.log(`TreeAPI.deleteFolder(${id})`);
    await new Promise(r => setTimeout(r, 500));
    const hasChildren = mockFolders.some(f => f.parent_id === id);
    if (hasChildren) return false;
    const idx = mockFolders.findIndex(f => f.id === id);
    if (idx < 0) return false;
    mockFolders.splice(idx, 1);
    return true;
  }
};