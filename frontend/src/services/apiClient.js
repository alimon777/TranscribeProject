import axios from 'axios';
// import { stat } from 'fs';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // Example: Add auth token if available
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response.data; 
  },
  (error) => {
    console.error('API Error:', error.response || error.message);
    // Example: Handle 401 globally
    // if (error.response && error.response.status === 401) {
    //   window.location.href = '/login';
    // }
    return Promise.reject(error.response ? error.response.data : error);
  }
);
export const getPendingReviewTranscriptions = (params) => {
  return apiClient.get('/transcriptions/pending-reviews', { params });
};

export const getReviewHistoryTranscriptions = (params) => {
  return apiClient.get('/transcriptions/review-history', { params });
};

export const getFolderTree = () => {
  return apiClient.get('/folders/tree');
};

export const createFolder = (folderData) => {
  return apiClient.post('/folders', folderData);
};

export const renameFolder = (folderId, newName) => {
  return apiClient.put(`/folders/${folderId}`, { name: newName });
};

export const deleteFolder = (folderId) => {
  return apiClient.delete(`/folders/${folderId}`);
};

// export const saveTranscriptionAsDraft = (transcriptionId, updateData) => {
//   return apiClient.put(`/transcriptions/${transcriptionId}/save-draft`, updateData);
// };

export const finalizeTranscriptionIntegration = (transcriptionId, updatedData = null) => {
  return apiClient.put(`/transcriptions/${transcriptionId}/finalize-integration`, updatedData);
};

export const getRepositoryData = (params) => {
  return apiClient.get('/repository', { params });
};

export const deleteTranscription = (transcriptionId) => {
  return apiClient.delete(`/transcriptions/${transcriptionId}`);
};

export const getAdminConflicts = () => {
  return apiClient.get('/admin/conflicts');
};

export const getConflictDetail = (conflictId) => {
  return apiClient.get(`/admin/conflicts/${conflictId}/detail`);
};

export const resolveConflict = (conflictId, updateData) => {
  return apiClient.put(`/admin/conflicts/${conflictId}/resolve`, updateData);
};

export const getTranscriptionDetails = (transcriptionId) => {
  return apiClient.get(`/transcriptions/${transcriptionId}`);
};

export const createTranscription = (formData) => {
  return apiClient.post("/upload/transcribe", formData);
}

export const updateTranscription = (metadata) => {
  return apiClient.post("/transcribe/cleanup", metadata); 
}

export const relocateTranscription = (data) => {
  return apiClient.put("/reloacte/transcription", data);
}

export default apiClient;