// src/App.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  UploadCloud,
  Brain,
  FileEdit,
  FolderKanban,
  Clock,
  Settings,
  User,
  Eye,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ListFilter,
  RefreshCw,
  InfoIcon,
  Loader2,
  Save,
  Download,
  Trash2,
} from 'lucide-react';

// Shadcn/ui components (assumed globally registered)
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// Your existing mock data & APIs
import {
  SESSION_PURPOSES,
  TRANSCRIPTION_STATUSES,
  mockUploadAndProcess,
  mockFetchRepository,
  mockFetchAdminConflicts,
  mockSaveAsDraft,
  mockFinalizeIntegration,
  getMockRepositoryData,
  getFolderTreeData,
  treeApi,
} from './mockData';

// TreeView + utils
import { TreeView } from './components/ui/tree-view';
import {
  addNodeRecursive,
  renameNodeRecursiveById,
  deleteNodeRecursiveById,
  getNodePath,
} from './lib/tree-utils';

/* ============================================
   Reusable Components and Hooks
============================================ */

// Reusable StatusBadge component
const StatusBadge = ({ status }) => {
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
          className="bg-green-500 hover:bg-green-600"
        >
          Integrated
        </Badge>
      );
    case TRANSCRIPTION_STATUSES.ARCHIVED:
      return <Badge variant="secondary">Archived</Badge>;
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

// Common folder operations hook (used in Repository and Integration dialog)
export const useFolderOperations = (
  treeData,
  setTreeData,
  selectedFolder,
  setSelectedFolder
) => {
  const handleAdd = useCallback(
    async (parentId, name, proposedId, path) => {
      const res = await treeApi.addFolder(parentId, name, proposedId);
      if (res.success) {
        setTreeData((t) =>
          addNodeRecursive(t, parentId, { id: res.finalId, name, children: [] })
        );
        return { success: true, finalId: res.finalId };
      }
      return { success: false };
    },
    [setTreeData]
  );

  const handleRename = useCallback(
    async (id, newName, oldName) => {
      if (await treeApi.renameFolder(id, newName)) {
        setTreeData((t) => renameNodeRecursiveById(t, id, newName));
        return true;
      }
      alert(`Failed to rename "${oldName}"`);
      return false;
    },
    [setTreeData]
  );

  const handleDelete = useCallback(
    async (id, name) => {
      if (await treeApi.deleteFolder(id)) {
        setTreeData((t) => deleteNodeRecursiveById(t, id));
        if (selectedFolder === id) setSelectedFolder(null);
        return true;
      }
      alert(`Cannot delete "${name}" — it has subfolders.`);
      return false;
    },
    [setTreeData, selectedFolder, setSelectedFolder]
  );

  return { handleAdd, handleRename, handleDelete };
};

/* ============================================
   App Bar Component
============================================ */
const AppBar = () => {
  const location = useLocation();
  const navItems = [
    { path: '/upload', label: 'Upload', Icon: UploadCloud },
    { path: '/pending-reviews', label: 'Pending Reviews', Icon: Clock },
    { path: '/repository', label: 'Repository', Icon: FolderKanban },
    { path: '/admin', label: 'Admin', Icon: Settings },
  ];

  return (
    <header className="bg-card py-3 px-4 md:px-6 border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-full mx-auto flex justify-between items-center">
        <Link
          to="/"
          className="text-lg md:text-xl font-semibold text-primary no-underline"
        >
          Intelligent Processor
        </Link>
        <nav className="flex gap-1 md:gap-2 items-center">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={
                location.pathname === item.path ||
                  (location.pathname.startsWith(item.path) && item.path !== '/')
                  ? 'secondary'
                  : 'ghost'
              }
              size="sm"
              asChild
            >
              <Link to={item.path} className="flex items-center">
                <item.Icon className="h-4 w-4 mr-0 md:mr-1.5" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5 text-muted-foreground" />
          </Button>
        </nav>
      </div>
    </header>
  );
};

/* ============================================
   Home Page Component
============================================ */
const HomePage = () => {
  const navigate = useNavigate();
  const homeCardsData = [
    {
      title: 'Upload & Process',
      Icon: UploadCloud,
      description:
        'Upload files and provide context for intelligent processing.',
      buttonText: 'Start Processing',
      link: '/upload',
      buttonVariant: 'default',
    },
    {
      title: 'Pending Reviews',
      Icon: Clock,
      description:
        'Review transcriptions awaiting approval or in progress.',
      buttonText: 'View Pending Reviews',
      link: '/pending-reviews',
      buttonVariant: 'outline',
    },
    {
      title: 'Admin Dashboard',
      Icon: Settings,
      description:
        'Manage disputed content and resolve integration conflicts.',
      buttonText: 'Admin Interface',
      link: '/admin',
      buttonVariant: 'outline',
    },
    {
      title: 'Transcription Repository',
      Icon: FolderKanban,
      description:
        'Browse, organize, and search all stored transcriptions.',
      buttonText: 'Browse Repository',
      link: '/repository',
      buttonVariant: 'outline',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-bold mb-3 text-foreground">
          Intelligent Audio/Video Content Processor
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Transform your audio and video content into structured, searchable
          knowledge with AI-powered processing and intelligent integration.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {homeCardsData.map(
          ({
            title,
            Icon,
            description,
            buttonText,
            link,
            buttonVariant,
          }) => (
            <Card
              key={title}
              className="hover:shadow-lg transition-shadow duration-300 flex flex-col text-center"
            >
              <CardHeader className="items-center pb-2 pt-6">
                <div className="flex justify-center w-full">
                  <Icon className="h-10 w-10 mb-4 text-primary" />
                </div>
                <CardTitle className="text-md font-semibold">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant={buttonVariant}
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(link)}
                >
                  {buttonText}
                </Button>
              </CardFooter>
            </Card>
          )
        )}
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              {
                Icon: UploadCloud,
                title: 'Upload Content',
                desc: 'Upload audio/video files with context and metadata',
              },
              {
                Icon: Brain,
                title: 'AI Processing',
                desc: 'AI cleans transcription and generates supplementary materials',
              },
              {
                Icon: FileEdit,
                title: 'Review & Edit',
                desc: 'Review and make final edits to generated content',
              },
              {
                Icon: FolderKanban,
                title: 'Integration',
                desc: 'Intelligently integrate into existing knowledge base',
              },
            ].map(({ Icon, title, desc }, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="bg-primary/10 text-primary rounded-full p-3 mb-3">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-md mb-1">
                  {index + 1}. {title}
                </h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ============================================
   Upload & Process Page Component
============================================ */
const UploadPage = ({ setProcessedDataForReview }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionPurpose, setSessionPurpose] = useState('');
  const [primaryTopic, setPrimaryTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [generateQuiz, setGenerateQuiz] = useState(false);
  const [integrateKB, setIntegrateKB] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0])
      setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !sessionTitle) {
      alert('Please provide a session title or upload a file.');
      return;
    }
    setIsProcessing(true);
    try {
      const metadata = {
        sessionTitle,
        sessionPurpose,
        primaryTopic,
        keywords,
        generateQuiz,
        integrateKB,
        uploadTime: new Date().toISOString(),
      };
      const result = await mockUploadAndProcess(
        file ? { name: file.name, type: file.type, size: file.size } : null,
        metadata
      );
      setProcessedDataForReview(result);
      navigate('/review');
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to process content.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-left pl-3 pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">
          Upload & Process Content
        </h1>
        <p className="text-md text-muted-foreground">
          Upload your audio or video file and provide context for intelligent
          processing.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Context & Metadata</CardTitle>
                <CardDescription className="text-xs">
                  Provide context to improve transcription accuracy and content
                  organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label
                    htmlFor="sessionTitle"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    Session Title{' '}
                    <span className="text-xs text-muted-foreground">
                      (Optional but Recommended)
                    </span>
                  </label>
                  <Input
                    id="sessionTitle"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="e.g., Q3 Project Phoenix Planning"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sessionPurpose"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    Session Purpose
                  </label>
                  <Select value={sessionPurpose} onValueChange={setSessionPurpose}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_PURPOSES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    htmlFor="primaryTopic"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    Primary Topic/Domain
                  </label>
                  <Input
                    id="primaryTopic"
                    value={primaryTopic}
                    onChange={(e) => setPrimaryTopic(e.target.value)}
                    placeholder="e.g., 'CRM System Enhancements', 'Cloud Security'"
                  />
                </div>
                <div>
                  <label
                    htmlFor="keywords"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    Specific Keywords, Acronyms, or Jargon
                  </label>
                  <Textarea
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder={`Enter one term per line. e.g.,
CSP (Cloud Service Provider)
Project Cerebro`}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This helps correct misinterpretations and ensures
                    domain-specific terms are accurate.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Upload</CardTitle>
                <CardDescription className="text-xs">
                  Select your audio or video file for processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted p-8 text-center rounded-md cursor-pointer hover:border-primary transition-colors bg-muted/20"
                  onClick={() =>
                    document.getElementById('fileInput')?.click()
                  }
                >
                  <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground font-medium">
                    Click to upload or drag and drop
                  </p>
                  <input
                    type="file"
                    id="fileInput"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file && (
                    <p className="mt-2 text-xs text-green-600">
                      Selected: {file.name} (
                      {(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum file size: 500MB
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Supported Audio: MP3, WAV, M4A, AAC, FLAC
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported Video: MP4, MOV, AVI, MKV, WMV
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Desired Outputs & Actions
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose what you'd like the system to generate and do with your
                  content.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generateQuiz"
                    checked={generateQuiz}
                    onCheckedChange={setGenerateQuiz}
                  />
                  <label
                    htmlFor="generateQuiz"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Generate Quiz/Mock Assignment
                  </label>
                </div>
                <div className="flex items-top space-x-2">
                  <Checkbox
                    id="integrateKB"
                    checked={integrateKB}
                    onCheckedChange={setIntegrateKB}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="integrateKB"
                      className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Integrate into Knowledge Base
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="inline h-3.5 w-3.5 ml-1 text-muted-foreground relative -top-px" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Anomalies may be flagged for admin review.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full text-base mt-8 md:col-span-2"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              'Transcribe & Process'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

/* ============================================
   Review & Edit Page Component
============================================ */
const ReviewPage = ({ processedData, setProcessedDataForReview }) => {
  const navigate = useNavigate();
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState(
    processedData?.cleanedTranscription || ''
  );
  const [editedQuiz, setEditedQuiz] = useState(
    processedData?.generatedQuiz || ''
  );

  useEffect(() => {
    if (!processedData) {
      navigate('/upload');
      return;
    }
    setEditedTranscription(processedData.cleanedTranscription);
    setEditedQuiz(processedData.generatedQuiz || '');
  }, [processedData, navigate]);

  if (!processedData)
    return (
      <div className="p-8 text-center flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />{' '}
        <span className="ml-2">Loading review data...</span>
      </div>
    );

  const { sessionInfo, knowledgeBaseIntegration, generateQuiz } = processedData;
  const currentDataForBackend = {
    ...processedData,
    cleanedTranscription: editedTranscription,
    generatedQuiz: editedQuiz,
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      const result = await mockSaveAsDraft(currentDataForBackend);
      alert(result.message);
      setProcessedDataForReview(null);
      navigate('/repository');
    } catch (e) {
      alert('Failed to save draft.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntegrationFolderSelected = async (selectedFolder) => {
    setIsFolderModalOpen(false);
    setIsLoading(true);
    try {
      const result = await mockFinalizeIntegration(
        currentDataForBackend,
        selectedFolder
      );
      alert(result.message);
      setProcessedDataForReview(null);
      navigate('/repository');
    } catch (e) {
      alert('Failed to finalize integration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Discard changes?')) {
      setProcessedDataForReview(null);
      navigate('/upload');
    }
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">
          Review & Edit Generated Content
        </h1>
        <p className="text-md text-muted-foreground">
          Review the processed content and make any necessary edits before
          finalizing.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 rounded-md shadow-sm">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">
              Content processing completed successfully. Review below.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Generated & Cleaned Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedTranscription}
                onChange={(e) => setEditedTranscription(e.target.value)}
                rows={15}
                className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
                placeholder="Transcription will appear here..."
              />
            </CardContent>
          </Card>
          {generateQuiz && editedQuiz && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Generated Quiz/Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editedQuiz}
                  onChange={(e) => setEditedQuiz(e.target.value)}
                  rows={8}
                  className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
                  placeholder="Quiz/Assignment will appear here..."
                />
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <p>
                <strong>Title:</strong>{' '}
                <span className="text-foreground">{sessionInfo.title}</span>
              </p>
              <p>
                <strong>Purpose:</strong>{' '}
                <span className="text-foreground">{sessionInfo.purpose}</span>
              </p>
              <p>
                <strong>Domain:</strong>{' '}
                <span className="text-foreground">{sessionInfo.domain}</span>
              </p>
              <p>
                <strong>Processing Time:</strong>{' '}
                <span className="text-foreground">
                  {sessionInfo.processingTime}
                </span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Knowledge Base Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-700 dark:text-yellow-300 p-3 rounded-md text-xs mb-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{knowledgeBaseIntegration.suggestionText}</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                <strong>Proposed Location:</strong>
              </p>
              <ul className="list-disc list-inside pl-1 text-xs text-muted-foreground">
                {knowledgeBaseIntegration.proposedLocation.map((loc, i) => (
                  <li key={i} className="text-foreground">
                    {loc}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button
                size="sm"
                className="w-full"
                onClick={() => setIsFolderModalOpen(true)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save & Finalize Integration
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleSaveDraft}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileEdit className="h-4 w-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button size="sm" variant="outline" className="w-full" disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" /> Download Content
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleDiscard}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Discard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <IntegrationFolderDialog
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onConfirm={handleIntegrationFolderSelected}
        suggestedPath={knowledgeBaseIntegration.proposedLocation}
      />
    </div>
  );
};

/* ============================================
   Pending Reviews Page Component
============================================ */
const PendingReviewsPage = () => {
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [timeSinceLastUpdateInSeconds, setTimeSinceLastUpdateInSeconds] = useState(0);
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      const repoData = await getMockRepositoryData();

      const currentPending = repoData.transcriptions
        .map((t) => {
          if (t.id === 'trans_2')
            return { ...t, actual_status: TRANSCRIPTION_STATUSES.DRAFT, progress: 75 };
          if (
            Math.random() < 0.3 &&
            t.status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
            t.status !== TRANSCRIPTION_STATUSES.ARCHIVED
          )
            return {
              ...t,
              actual_status: TRANSCRIPTION_STATUSES.PROCESSING,
              progress: Math.floor(Math.random() * 90) + 10,
            };
          if (
            Math.random() < 0.2 &&
            t.status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
            t.status !== TRANSCRIPTION_STATUSES.ARCHIVED
          )
            return { ...t, actual_status: 'Awaiting Approval', progress: 100 };
          return { ...t, actual_status: t.status, progress: t.status === TRANSCRIPTION_STATUSES.INTEGRATED ? 100 : 0 };
        })
        .filter(
          (t) =>
            t.actual_status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
            t.actual_status !== TRANSCRIPTION_STATUSES.ARCHIVED
        )
        .slice(0, 5);
      setPendingItems(currentPending);

      const historical = repoData.transcriptions
        .filter(
          (t) =>
            t.status === TRANSCRIPTION_STATUSES.INTEGRATED ||
            t.status === TRANSCRIPTION_STATUSES.ARCHIVED
        )
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 4)
        .map((t) => ({
          ...t,
          action_taken:
            t.status === TRANSCRIPTION_STATUSES.INTEGRATED
              ? 'Approved & Integrated'
              : 'Archived',
          action_date: t.updated_at,
          reviewed_by: 'Admin User',
        }));
      setHistoryItems(historical);
      setLastUpdateTime(new Date());
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    setTimeSinceLastUpdateInSeconds(0);
    const intervalId = setInterval(() => {
      setTimeSinceLastUpdateInSeconds((prevSeconds) => prevSeconds + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [lastUpdateTime]);

  const handleRefreshQueue = () => {
    setIsRefreshingQueue(true);
    setTimeout(async () => {
      const repoData = await getMockRepositoryData();
      const currentPending = repoData.transcriptions
        .map((t) => {
          if (t.id === 'trans_2')
            return { ...t, actual_status: TRANSCRIPTION_STATUSES.DRAFT, progress: 75 };
          if (
            Math.random() < 0.3 &&
            t.status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
            t.status !== TRANSCRIPTION_STATUSES.ARCHIVED
          )
            return {
              ...t,
              actual_status: TRANSCRIPTION_STATUSES.PROCESSING,
              progress: Math.floor(Math.random() * 90) + 10,
            };
          if (
            Math.random() < 0.2 &&
            t.status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
            t.status !== TRANSCRIPTION_STATUSES.ARCHIVED
          )
            return { ...t, actual_status: 'Awaiting Approval', progress: 100 };
          return { ...t, actual_status: t.status, progress: t.status === TRANSCRIPTION_STATUSES.INTEGRATED ? 100 : 0 };
        })
        .filter(
          (t) =>
            t.actual_status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
            t.actual_status !== TRANSCRIPTION_STATUSES.ARCHIVED
        )
        .slice(0, 5 + Math.floor(Math.random() * 3 - 1));
      setPendingItems(currentPending);
      setLastUpdateTime(new Date());
      setIsRefreshingQueue(false);
    }, 1000);
  };

  const getHistoryActionBadge = (action) => {
    if (action.includes('Approved'))
      return (
        <Badge
          variant="default"
          className="bg-green-500 hover:bg-green-600"
        >
          Approved
        </Badge>
      );
    if (action.includes('Archived'))
      return <Badge variant="outline">Archived</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  };

  if (isLoading)
    return (
      <div className="p-8 text-center flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />{' '}
        <span className="ml-2">Loading pending reviews...</span>
      </div>
    );

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-left pl-3 pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">
          Pending Reviews & In-Progress
        </h1>
        <p className="text-md text-muted-foreground">
          Track transcriptions that are being processed or awaiting your review.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="lg:col-span-1">
          <Card className="pb-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Current Queue</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Last updated: {timeSinceLastUpdateInSeconds}s ago
                </span>
                <Button
                  variant="ghost"
                  size="icon_sm"
                  onClick={handleRefreshQueue}
                  disabled={isRefreshingQueue}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshingQueue ? 'animate-spin' : ''
                      }`}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingItems.length === 0 && !isLoading && (
                <p className="text-muted-foreground text-sm text-center py-10 px-4">
                  No items currently pending.
                </p>
              )}
              {pendingItems.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto relative">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="text-xs pl-4 pr-2">Title</TableHead>
                        <TableHead className="text-xs px-2 hidden sm:table-cell">
                          Uploaded
                        </TableHead>
                        <TableHead className="text-xs px-2">Status</TableHead>
                        <TableHead className="text-xs text-right pr-4 pl-2">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-xs py-2.5 pl-4 pr-2">
                            {item.session_title}
                          </TableCell>
                          <TableCell className="text-xs px-2 hidden sm:table-cell">
                            {new Date(item.uploaded_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs px-2">
                            <StatusBadge status={item.actual_status} />
                          </TableCell>
                          <TableCell className="text-right pr-4 pl-2">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => navigate(`/review`)}
                            >
                              <Eye size={12} className="mr-1" /> Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="pb-0">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History size={20} className="text-muted-foreground" />
                Review History
              </CardTitle>
              <CardDescription className="text-xs">
                Recently completed reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyItems.length === 0 && !isLoading && (
                <p className="text-muted-foreground text-sm text-center py-10 px-4">
                  No recent history.
                </p>
              )}
              {historyItems.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto relative">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="text-xs pl-4 pr-2">Title</TableHead>
                        <TableHead className="text-xs px-2 hidden sm:table-cell">
                          Date
                        </TableHead>
                        <TableHead className="text-xs text-right pr-4 pl-2">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-xs py-2 pl-4 pr-2 truncate max-w-[150px]">
                            {item.session_title}
                          </TableCell>
                          <TableCell className="text-xs px-2 hidden sm:table-cell">
                            {new Date(item.action_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-right pr-4 pl-2">
                            {getHistoryActionBadge(item.action_taken)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ============================================
   TranscriptionPreview Component
   (Updated with action buttons moved outside)
============================================ */
const TranscriptionPreview = ({
  transcription,
  folderName,
  onClose,
  onExpand,
  onDelete,
  onMove,
  onDownload,
}) => {
  return (
    <div className="w-80 space-y-3">
      {/* Action Buttons - Now outside the modal */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onMove}
        >
          <FileEdit className="h-4 w-4 mr-1" />
          Move
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onDownload}
        >
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>

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
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 -mt-1"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
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

          <div>
            <div className="text-xs font-medium mb-1">Status</div>
            <StatusBadge status={transcription.status} />
          </div>

          <div>
            <div className="text-xs font-medium mb-2">Content</div>
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded text-left max-h-32 overflow-y-auto">
              {transcription.cleaned_transcript_text?.substring(0, 200)}...
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onExpand}
          >
            <Eye className="h-4 w-4 mr-2" />
            Open in Editor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

/* ============================================
   TranscriptionExpandedPreview Component
   (Updated to be wider and without action buttons in sidebar)
============================================ */
const TranscriptionExpandedPreview = ({
  transcription,
  folderName,
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {transcription.session_title}
          </DialogTitle>
          <DialogDescription>
            {folderName} • {transcription.source_file_name} • Processed on{' '}
            {new Date(transcription.processed_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-5 gap-6 overflow-hidden">
          {/* Content Area - Now takes up more space */}
          <div className="col-span-4 flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/30 p-4 rounded">
                  {transcription.cleaned_transcript_text}
                </pre>
              </div>
              {transcription.quiz_content && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">
                    Generated Quiz
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/30 p-4 rounded">
                      {transcription.quiz_content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Smaller and without action buttons */}
          <div className="col-span-1 space-y-4 overflow-auto">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-xs text-muted-foreground uppercase">
                    Folder
                  </div>
                  <div>{folderName}</div>
                </div>
                <div>
                  <div className="font-medium text-xs text-muted-foreground uppercase">
                    Purpose
                  </div>
                  <div>{transcription.session_purpose}</div>
                </div>
                <div>
                  <div className="font-medium text-xs text-muted-foreground uppercase">
                    Status
                  </div>
                  <StatusBadge status={transcription.status} />
                </div>
                <div>
                  <div className="font-medium text-xs text-muted-foreground uppercase">
                    Processing Time
                  </div>
                  <div>
                    {Math.floor(transcription.processing_time_seconds / 60)}m{' '}
                    {transcription.processing_time_seconds % 60}s
                  </div>
                </div>
                <div>
                  <div className="font-medium text-xs text-muted-foreground uppercase">
                    Uploaded
                  </div>
                  <div>
                    {new Date(transcription.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                {transcription.integrated_at && (
                  <div>
                    <div className="font-medium text-xs text-muted-foreground uppercase">
                      Integrated
                    </div>
                    <div>
                      {new Date(transcription.integrated_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {transcription.topics?.map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============================================
   Repository Page Component
   (Updated to handle the new action button structure)
============================================ */
const RepositoryPage = () => {
  const [treeData, setTreeData] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [transcriptions, setTranscriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTranscription, setSelectedTranscription] = useState(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);

  // Use the common folder operations hook
  const { handleAdd, handleRename, handleDelete } = useFolderOperations(
    treeData,
    setTreeData,
    selectedFolder,
    setSelectedFolder
  );

  // load repository data on mount
  const reload = useCallback(async () => {
    const repo = await mockFetchRepository();
    setTranscriptions(repo.transcriptions);
    setTreeData(getFolderTreeData());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Filter transcriptions by folder and search term
  const list = transcriptions
    .filter(
      (t) =>
        !selectedFolder ||
        selectedFolder === 'all' ||
        t.folder_id === selectedFolder
    )
    .filter(
      (t) =>
        !search ||
        t.session_title.toLowerCase().includes(search.toLowerCase())
    );

  // Get folder name from treeData
  const getFolderName = (folderId) => {
    if (!folderId || folderId === 'all') return 'All Transcriptions';
    const findFolder = (nodes) => {
      for (const node of nodes) {
        if (node.id === folderId) return node.name;
        if (node.children) {
          const found = findFolder(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFolder(treeData) || 'Unknown Folder';
  };

  // Handler for moving a transcription
  const handleMoveTranscription = (targetFolderId, pathArray) => {
    if (!selectedTranscription) return;
    // update folder_id of the selected transcription
    setTranscriptions((prev) =>
      prev.map((t) =>
        t.id === selectedTranscription.id
          ? { ...t, folder_id: targetFolderId }
          : t
      )
    );
    alert(
      `Transcription moved to folder: ${pathArray.join(
        ' / '
      )}. Please refresh if needed.`
    );
    setSelectedTranscription(null);
  };

  // Handler for deleting a transcription
  const handleDeleteTranscription = () => {
    if (!selectedTranscription) return;
    if (
      window.confirm(
        `Are you sure you want to delete "${selectedTranscription.session_title}"?`
      )
    ) {
      setTranscriptions((prev) =>
        prev.filter((t) => t.id !== selectedTranscription.id)
      );
      setSelectedTranscription(null);
    }
  };

  // Handler for downloading a transcription
  const handleDownloadTranscription = () => {
    if (!selectedTranscription) return;
    // Create a simple text file download
    const content = `Title: ${selectedTranscription.session_title}\n\nTranscription:\n${selectedTranscription.cleaned_transcript_text}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTranscription.session_title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-left pl-3 pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">
          Transcription Repository
        </h1>
        <p className="text-md text-muted-foreground">
          Browse, organize, and search all stored transcriptions.
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar: Folder Tree */}
        <aside className="w-full lg:w-64 border rounded p-2 space-y-2">
          <div className="flex justify-between items-center px-4 pt-3">
            <h2 className="font-medium">Folders</h2>
          </div>
          <TreeView
            data={treeData}
            initialSelectedId={selectedFolder}
            onNodeSelect={(id) => setSelectedFolder(id)}
            onNodeAddCommit={handleAdd}
            onNodeEditCommit={handleRename}
            onNodeDeleteCommit={handleDelete}
            enableEditing={true}
            allowRootFolderAdd={true}
          />
        </aside>

        {/* Main Content: Transcriptions Table and Preview */}
        <section className="flex-1 space-y-4">
          <Input
            placeholder="Search transcriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex gap-6">
            {/* Transcriptions Table */}
            <div className={`${selectedTranscription ? 'flex-1' : 'w-full'} transition-all duration-300`}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Transcriptions in {getFolderName(selectedFolder)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {list.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground">
                      No items found.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Topics</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((t) => (
                          <TableRow
                            key={t.id}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedTranscription?.id === t.id ? 'bg-muted' : ''
                              }`}
                            onClick={() => setSelectedTranscription(t)}
                          >
                            <TableCell>
                              <div className="font-medium">{t.session_title}</div>
                              <div className="text-xs text-muted-foreground">
                                {t.source_file_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(t.processed_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {t.session_purpose}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {t.topics?.slice(0, 2).map((topic) => (
                                  <Badge key={topic} variant="outline" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                                {t.topics?.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{t.topics.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={t.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTranscription(t);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            {selectedTranscription && (
              <TranscriptionPreview
                transcription={selectedTranscription}
                folderName={getFolderName(selectedTranscription.folder_id)}
                onClose={() => setSelectedTranscription(null)}
                onExpand={() => setIsPreviewExpanded(true)}
                onDelete={handleDeleteTranscription}
                onMove={() => setMoveModalOpen(true)}
                onDownload={handleDownloadTranscription}
              />
            )}
          </div>
        </section>
      </div>

      {/* Expanded Preview Dialog */}
      {selectedTranscription && (
        <TranscriptionExpandedPreview
          transcription={selectedTranscription}
          folderName={getFolderName(selectedTranscription.folder_id)}
          isOpen={isPreviewExpanded}
          onClose={() => setIsPreviewExpanded(false)}
        />
      )}

      {/* Move-to Modal using IntegrationFolderDialog for moving */}
      {moveModalOpen && (
        <IntegrationFolderDialog
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          onConfirm={handleMoveTranscription}
        />
      )}
    </div>
  );
};

/* ============================================
   IntegrationFolderDialog Component
   (Used for both integration and move-to actions)
============================================ */
export function IntegrationFolderDialog({
  isOpen,
  onClose,
  suggestedPath = [],
  onConfirm,
}) {
  const [treeData, setTreeData] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Use the common folder operations hook (editing enabled here)
  const { handleAdd, handleRename, handleDelete } = useFolderOperations(
    treeData,
    setTreeData,
    selectedFolder,
    setSelectedFolder
  );

  // load tree on open
  useEffect(() => {
    if (isOpen) {
      setTreeData(getFolderTreeData());
      setSelectedFolder(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // compute path array by walking up the tree
    const buildPath = (nodes, targetId, acc = []) => {
      for (const n of nodes) {
        const next = [...acc, n.name];
        if (n.id === targetId) return next;
        if (n.children?.length) {
          const found = buildPath(n.children, targetId, next);
          if (found) return found;
        }
      }
    };
    const pathArray = selectedFolder ? buildPath(treeData, selectedFolder) : [];
    onConfirm(selectedFolder, pathArray);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Folder</DialogTitle>
          <DialogDescription>
            Suggested path: {suggestedPath.join(' / ') || '—'}
            <br />
            Click a folder or create a new one, then confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="h-64 overflow-auto border rounded p-2 mb-4">
          <TreeView
            data={treeData}
            initialSelectedId={selectedFolder}
            onNodeSelect={(id) => setSelectedFolder(id)}
            onNodeAddCommit={handleAdd}
            onNodeEditCommit={handleRename}
            onNodeDeleteCommit={handleDelete}
            enableEditing={true}
            allowRootFolderAdd={true}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={!selectedFolder}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================
   Main App Component
============================================ */
export default function App() {
  const [processedDataForReview, setProcessedDataForReview] = useState(null);

  return (
    <Router>
      <TooltipProvider>
        <AppBar />
        <main className="p-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/upload"
              element={
                <UploadPage
                  setProcessedDataForReview={setProcessedDataForReview}
                />
              }
            />
            <Route
              path="/review"
              element={
                <ReviewPage
                  processedData={processedDataForReview}
                  setProcessedDataForReview={setProcessedDataForReview}
                />
              }
            />
            <Route path="/pending-reviews" element={<PendingReviewsPage />} />
            <Route path="/repository" element={<RepositoryPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Routes>
        </main>
      </TooltipProvider>
    </Router>
  );
}

/* ============================================
   Admin Dashboard Page Component
   (Unchanged from before)
============================================ */
const AdminDashboardPage = () => {
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    mockFetchAdminConflicts().then((data) => {
      setConflicts(data);
      setIsLoading(false);
    });
  }, []);

  const summaryStats = isLoading
    ? {}
    : {
      pending: conflicts.filter(
        (c) => c.status === 'Pending Review'
      ).length,
      resolved: conflicts.filter(
        (c) => c.status && c.status.startsWith('Resolved')
      ).length,
      rejected: conflicts.filter(
        (c) => c.status && c.status.startsWith('Rejected')
      ).length,
      total: conflicts.length,
    };

  const statCards = [
    {
      title: 'Pending Review',
      value: summaryStats.pending,
      Icon: AlertTriangle,
      color: 'text-yellow-500',
    },
    {
      title: 'Resolved',
      value: summaryStats.resolved,
      Icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Rejected',
      value: summaryStats.rejected,
      Icon: XCircle,
      color: 'text-red-500',
    },
    {
      title: 'Total Items',
      value: summaryStats.total,
      Icon: ListFilter,
      color: 'text-primary',
    },
  ];

  if (isLoading)
    return (
      <div className="p-8 text-center flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />{' '}
        <span className="ml-2">Loading Admin Dashboard...</span>
      </div>
    );

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-left pl-3 pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">
          Admin Dashboard
        </h1>
        <p className="text-md text-muted-foreground">
          Manage disputed content and resolve integration conflicts.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle className="text-lg">Disputed Content & Anomalies</CardTitle>
          <CardDescription className="text-xs">
            Review and resolve conflicts between new and existing content.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-y-auto relative">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap pl-4 pr-2">
                    New Content
                  </TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">
                    Existing Content
                  </TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">
                    Anomaly
                  </TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">
                    Date
                  </TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">
                    Status
                  </TableHead>
                  <TableHead className="text-xs text-right w-[80px] whitespace-nowrap pr-4 pl-2">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((c) => {
                  let anomalyBadgeClass =
                    'text-[10px] py-0.5 px-1.5 rounded-full whitespace-nowrap ';
                  if (c.anomaly_type === 'Semantic Difference') {
                    anomalyBadgeClass +=
                      'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300';
                  } else if (c.anomaly_type === 'Significant Overlap') {
                    anomalyBadgeClass +=
                      'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300';
                  } else {
                    anomalyBadgeClass +=
                      'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300';
                  }

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs py-2.5 pl-4 pr-2">
                        {c.new_transcription_title}
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {c.new_content_snippet}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-2">
                        {c.existing_kb_document_id}
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {c.existing_content_snippet}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-2">
                        <span className={anomalyBadgeClass}>
                          {c.anomaly_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-2">
                        {new Date(c.flagged_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-2">
                        <span
                          className={`py-0.5 px-1.5 rounded-full text-[10px] font-medium whitespace-nowrap ${c.status === 'Pending Review'
                              ? 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300'
                              : c.status &&
                                c.status.startsWith('Resolved')
                                ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                          {c.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4 pl-2">
                        <Button variant="outline" size="xs">
                          <Eye size={12} className="mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};