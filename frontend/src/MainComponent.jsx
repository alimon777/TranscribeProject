// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  UploadCloud, Brain, Shield, FolderKanban, ChevronLeft, ChevronDown, ChevronRight, Search, SlidersHorizontal, Eye, MoreHorizontal, FileText, Trash2, Save, Download, AlertTriangle, CheckCircle, XCircle, ListFilter, PlusCircle, User, FileEdit, FileArchive, Clock, Loader2, Hourglass, Settings, History, Info as InfoIconLucide, RefreshCw, FolderPlus, Pencil
} from 'lucide-react';

// Shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // DropdownMenuLabel, // Not used, can be removed
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import {
  SESSION_PURPOSES,
  TRANSCRIPTION_STATUSES,
  mockUploadAndProcess,
  mockFetchRepository,
  mockFetchAdminConflicts,
  mockSaveAsDraft,
  mockFinalizeIntegration,
  getMockRepositoryData,
  mockCreateFolder, 
  mockDeleteFolder,
  mockEditFolderName,
} from './mockData'; // Assuming mockData.js is in the same directory or configured path

// --- App Bar Component ---
const AppBar = () => {
  const location = useLocation();
  const navItems = [
    { path: "/upload", label: "Upload", Icon: UploadCloud },
    { path: "/pending-reviews", label: "Pending Reviews", Icon: Clock },
    { path: "/repository", label: "Repository", Icon: FolderKanban },
    { path: "/admin", label: "Admin", Icon: Settings },
  ];

  return (
    <header className="bg-card py-3 px-4 md:px-6 border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-full mx-auto flex justify-between items-center">
        <Link to="/" className="text-lg md:text-xl font-semibold text-primary no-underline">
          Intelligent Processor
        </Link>
        <nav className="flex gap-1 md:gap-2 items-center">
          {navItems.map(item => (
            <Button
              key={item.path}
              variant={location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== "/") ? "secondary" : "ghost"}
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

// --- Home Page Component ---
const HomePage = () => {
  const navigate = useNavigate();
  const homeCardsData = [
    { title: "Upload & Process", Icon: UploadCloud, description: "Upload files and provide context for intelligent processing.", buttonText: "Start Processing", link: "/upload", buttonVariant: "default" },
    { title: "Pending Reviews", Icon: Clock, description: "Review transcriptions awaiting approval or in progress.", buttonText: "View Pending Reviews", link: "/pending-reviews", buttonVariant: "outline" },
    { title: "Admin Dashboard", Icon: Settings, description: "Manage disputed content and resolve integration conflicts.", buttonText: "Admin Interface", link: "/admin", buttonVariant: "outline" },
    { title: "Transcription Repository", Icon: FolderKanban, description: "Browse, organize, and search all stored transcriptions.", buttonText: "Browse Repository", link: "/repository", buttonVariant: "outline" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-bold mb-3 text-foreground">Intelligent Audio/Video Content Processor</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Transform your audio and video content into structured, searchable knowledge with AI-powered processing and intelligent integration.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {homeCardsData.map(({ title, Icon, description, buttonText, link, buttonVariant }) => (
          <Card key={title} className="hover:shadow-lg transition-shadow duration-300 flex flex-col text-center">
            <CardHeader className="items-center pb-2 pt-6">
              <div className="flex justify-center w-full">
                <Icon className="h-10 w-10 mb-4 text-primary" />
              </div>
              <CardTitle className="text-md font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <CardDescription className="text-xs">{description}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button variant={buttonVariant} size="sm" className="w-full" onClick={() => navigate(link)}>
                {buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { Icon: UploadCloud, title: "Upload Content", desc: "Upload audio/video files with context and metadata" },
              { Icon: Brain, title: "AI Processing", desc: "AI cleans transcription and generates supplementary materials" },
              { Icon: FileEdit, title: "Review & Edit", desc: "Review and make final edits to generated content" },
              { Icon: FolderKanban, title: "Integration", desc: "Intelligently integrate into existing knowledge base" }
            ].map(({ Icon, title, desc }, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="bg-primary/10 text-primary rounded-full p-3 mb-3">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-md mb-1">{index + 1}. {title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Upload & Process Page Component ---
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
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !sessionTitle) {
      alert("Please provide a session title or upload a file."); return;
    }
    setIsProcessing(true);
    try {
      const metadata = { sessionTitle, sessionPurpose, primaryTopic, keywords, generateQuiz, integrateKB, uploadTime: new Date().toISOString() };
      const result = await mockUploadAndProcess(file ? { name: file.name, type: file.type, size: file.size } : null, metadata);
      setProcessedDataForReview(result);
      navigate('/review');
    } catch (error) {
      console.error("Processing error:", error); alert("Failed to process content.");
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="p-4 md:p-6 w-full"> 
      <div className="mb-6 text-left pl-3 pb-2"> 
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">Upload & Process Content</h1>
        <p className="text-md text-muted-foreground">Upload your audio or video file and provide context for intelligent processing.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Context & Metadata</CardTitle>
                <CardDescription className="text-xs">Provide context to improve transcription accuracy and content organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="sessionTitle" className="text-sm font-medium text-foreground mb-1.5 block">Session Title <span className="text-xs text-muted-foreground">(Optional but Recommended)</span></label>
                  <Input id="sessionTitle" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} placeholder="e.g., Q3 Project Phoenix Planning" />
                </div>
                <div>
                  <label htmlFor="sessionPurpose" className="text-sm font-medium text-foreground mb-1.5 block">Session Purpose</label>
                  <Select value={sessionPurpose} onValueChange={setSessionPurpose}>
                    <SelectTrigger><SelectValue placeholder="Select session purpose" /></SelectTrigger>
                    <SelectContent>
                      {SESSION_PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="primaryTopic" className="text-sm font-medium text-foreground mb-1.5 block">Primary Topic/Domain</label>
                  <Input id="primaryTopic" value={primaryTopic} onChange={e => setPrimaryTopic(e.target.value)} placeholder="e.g., 'CRM System Enhancements', 'Cloud Security'" />
                </div>
                <div>
                  <label htmlFor="keywords" className="text-sm font-medium text-foreground mb-1.5 block">Specific Keywords, Acronyms, or Jargon</label>
                  <Textarea id="keywords" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Enter one term per line. e.g.,
CSP (Cloud Service Provider)
Project Cerebro" rows={3} />
                  <p className="text-xs text-muted-foreground mt-1">This helps correct misinterpretations and ensures domain-specific terms are accurate.</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Upload</CardTitle>
                <CardDescription className="text-xs">Select your audio or video file for processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted p-8 text-center rounded-md cursor-pointer hover:border-primary transition-colors bg-muted/20"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground font-medium">Click to upload or drag and drop</p>
                  <input type="file" id="fileInput" onChange={handleFileChange} className="hidden" />
                  {file && <p className="mt-2 text-xs text-green-600">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
                  <p className="text-xs text-muted-foreground mt-1">Maximum file size: 500MB</p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Supported Audio: MP3, WAV, M4A, AAC, FLAC</p>
                <p className="text-xs text-muted-foreground mt-1">Supported Video: MP4, MOV, AVI, MKV, WMV</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Desired Outputs & Actions</CardTitle>
                <CardDescription className="text-xs">Choose what you'd like the system to generate and do with your content.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="generateQuiz" checked={generateQuiz} onCheckedChange={setGenerateQuiz} />
                  <label htmlFor="generateQuiz" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Generate Quiz/Mock Assignment
                  </label>
                </div>
                <div className="items-top flex space-x-2">
                  <Checkbox id="integrateKB" checked={integrateKB} onCheckedChange={setIntegrateKB} />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="integrateKB" className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Integrate into Knowledge Base
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild><InfoIconLucide className="inline h-3.5 w-3.5 ml-1 text-muted-foreground relative -top-px" /></TooltipTrigger>
                          <TooltipContent><p className="text-xs">Anomalies may be flagged for admin review.</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button type="submit" size="lg" className="w-full text-base mt-8 md:col-span-2" disabled={isProcessing}>
            {isProcessing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>) : 'Transcribe & Process'}
          </Button>
        </div>
      </form>
    </div >
  );
};

// --- Review & Edit Page Component ---
const ReviewPage = ({ processedData, setProcessedDataForReview }) => {
  const navigate = useNavigate();
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState(processedData?.cleanedTranscription || '');
  const [editedQuiz, setEditedQuiz] = useState(processedData?.generatedQuiz || '');

  useEffect(() => {
    if (!processedData) { navigate('/upload'); return; }
    setEditedTranscription(processedData.cleanedTranscription);
    setEditedQuiz(processedData.generatedQuiz || '');
  }, [processedData, navigate]);

  if (!processedData) return <div className="p-8 text-center flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading review data...</span></div>;

  const { sessionInfo, knowledgeBaseIntegration, generateQuiz } = processedData;
  const currentDataForBackend = { ...processedData, cleanedTranscription: editedTranscription, generatedQuiz: editedQuiz };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      const result = await mockSaveAsDraft(currentDataForBackend); alert(result.message);
      setProcessedDataForReview(null); navigate('/repository');
    } catch (e) { alert("Failed to save draft."); } finally { setIsLoading(false); }
  };
  const handleIntegrationFolderSelected = async (selectedFolder) => {
    setIsFolderModalOpen(false); setIsLoading(true);
    try {
      const result = await mockFinalizeIntegration(currentDataForBackend, selectedFolder); alert(result.message);
      setProcessedDataForReview(null); navigate('/repository');
    } catch (e) { alert("Failed to finalize integration."); } finally { setIsLoading(false); }
  };
  const handleDiscard = () => {
    if (window.confirm("Discard changes?")) { setProcessedDataForReview(null); navigate('/upload'); }
  };
  return (
    <div className="p-4 md:p-6 w-full"> 
      <div className="mb-6 text-center"> 
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">Review & Edit Generated Content</h1>
        <p className="text-md text-muted-foreground">Review the processed content and make any necessary edits before finalizing.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 rounded-md shadow-sm">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">Content processing completed successfully. Review below.</p>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Generated & Cleaned Transcription</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={editedTranscription} onChange={(e) => setEditedTranscription(e.target.value)} rows={15} className="text-sm leading-relaxed whitespace-pre-wrap font-mono" placeholder="Transcription will appear here..." />
            </CardContent>
          </Card>
          {generateQuiz && editedQuiz && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Generated Quiz/Assignment</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={editedQuiz} onChange={(e) => setEditedQuiz(e.target.value)} rows={8} className="text-sm leading-relaxed whitespace-pre-wrap font-mono" placeholder="Quiz/Assignment will appear here..." />
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Session Information</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <p><strong>Title:</strong> <span className="text-foreground">{sessionInfo.title}</span></p>
              <p><strong>Purpose:</strong> <span className="text-foreground">{sessionInfo.purpose}</span></p>
              <p><strong>Domain:</strong> <span className="text-foreground">{sessionInfo.domain}</span></p>
              <p><strong>Processing Time:</strong> <span className="text-foreground">{sessionInfo.processingTime}</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Knowledge Base Integration</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-700 dark:text-yellow-300 p-3 rounded-md text-xs mb-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{knowledgeBaseIntegration.suggestionText}</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground"><strong>Proposed Location:</strong></p>
              <ul className="list-disc list-inside pl-1 text-xs text-muted-foreground">
                {knowledgeBaseIntegration.proposedLocation.map((loc, i) => <li key={i} className="text-foreground">{loc}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              <Button size="sm" className="w-full" onClick={() => setIsFolderModalOpen(true)} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save & Finalize Integration
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={handleSaveDraft} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileEdit className="h-4 w-4 mr-2" />} Save as Draft
              </Button>
              <Button size="sm" variant="outline" className="w-full" disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" /> Download Content
              </Button>
              <Button size="sm" variant="destructive" className="w-full" onClick={handleDiscard} disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-2" /> Discard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <IntegrationFolderDialog
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelectFolder={handleIntegrationFolderSelected}
        suggestedPathArray={knowledgeBaseIntegration.proposedLocation}
      />
    </div >
  );
};

// --- Integration Folder Dialog ---
const IntegrationFolderDialog = ({ isOpen, onClose, onSelectFolder, suggestedPathArray }) => {
  const [foldersForDialog, setFoldersForDialog] = useState([]);
  const [selectedFolderForDialog, setSelectedFolderForDialog] = useState(null);
  const [newSubFolderName, setNewSubFolderName] = useState("");
  const [isCreatingSubFolder, setIsCreatingSubFolder] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  const suggestedPathString = suggestedPathArray?.join(' / ') || "N/A";

  const fetchFoldersForDialog = useCallback(async () => {
    setIsLoadingFolders(true);
    try {
      const repoData = await getMockRepositoryData();
      setFoldersForDialog(repoData.folders.filter(f => f.id !== 'all').map(f => ({...f, path: f.path || f.name})));
    } catch (error) {
        console.error("Error fetching folders for dialog:", error);
        setFoldersForDialog([]);
    } finally {
        setIsLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFoldersForDialog().then(() => {
        if (suggestedPathArray && suggestedPathArray.length > 0) {
          const allRepoFolders = getMockRepositoryData().folders; 
          const targetName = suggestedPathArray[suggestedPathArray.length - 1].toLowerCase();
          const suggested = allRepoFolders.find(f => f.id !== 'all' && f.name.toLowerCase() === targetName && (f.path ? f.path.toLowerCase().includes(targetName) : true) );
          if (suggested) setSelectedFolderForDialog(suggested);
          else setSelectedFolderForDialog(null);
        } else {
          setSelectedFolderForDialog(null);
        }
      });
    } else {
      setSelectedFolderForDialog(null);
      setNewSubFolderName("");
    }
  }, [isOpen, suggestedPathArray, fetchFoldersForDialog]);

  const handleSelect = (folder) => setSelectedFolderForDialog(folder);

  const handleSubmit = () => {
    if (selectedFolderForDialog) onSelectFolder(selectedFolderForDialog);
    else alert("Please select a folder.");
  };

  const handleCreateSubFolder = async () => {
    if (!newSubFolderName.trim()) {
      alert("New folder name cannot be empty.");
      return;
    }
    setIsCreatingSubFolder(true);
    try {
      const parentId = selectedFolderForDialog ? selectedFolderForDialog.id : null; 
      await mockCreateFolder(newSubFolderName.trim(), parentId);
      setNewSubFolderName("");
      await fetchFoldersForDialog(); 
    } catch (error) {
      console.error("Failed to create subfolder:", error);
      alert(`Error: ${error.message || "Could not create subfolder."}`);
    } finally {
      setIsCreatingSubFolder(false);
    }
  };
  
  const renderFolderTree = (currentFolders, parentId = null, level = 0) => {
    return currentFolders
      .filter(f => (f.parent_id === parentId) || (parentId === null && !f.parent_id && f.id !== 'all'))
      .sort((a,b) => a.name.localeCompare(b.name)) 
      .map(folder => (
        <li key={folder.id} className={`list-none text-sm`}> {/* Removed ml here */}
          <div
            onClick={() => handleSelect(folder)}
            className={`p-1.5 cursor-pointer rounded flex items-center gap-1.5 hover:bg-muted/50 ml-${level * 4} ${selectedFolderForDialog?.id === folder.id ? 'bg-accent text-accent-foreground font-medium' : ''}`}
          >
            <FolderKanban className="h-4 w-4 text-muted-foreground" /> {folder.name}
          </div>
          {currentFolders.some(sf => sf.parent_id === folder.id) && <ul className="pl-0">{renderFolderTree(currentFolders, folder.id, level + 1)}</ul>}
        </li>
      ));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Select Repository Folder</DialogTitle>
          <DialogDescription className="text-xs">Choose where to save this transcription. You can also create a new subfolder.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-xs">
            <p className="text-muted-foreground"><strong>System Suggested Path:</strong> {suggestedPathString}</p>
            {selectedFolderForDialog && <p className="text-muted-foreground mt-1"><strong>Selected Path:</strong> {selectedFolderForDialog.path || selectedFolderForDialog.name}</p>}
          </div>
          <div className="border rounded-md p-3 h-60 overflow-y-auto bg-muted/20">
            {isLoadingFolders ? <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div> : 
            foldersForDialog.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No folders available. Create one below.</p> :
            <ul className="space-y-0.5">{renderFolderTree(foldersForDialog, null)}</ul>}
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="newSubFolderNameDialog" className="text-xs font-medium">Create New Folder (in selected, or root if none)</Label>
            <div className="flex gap-2">
              <Input 
                id="newSubFolderNameDialog" 
                placeholder="New folder name..." 
                value={newSubFolderName} 
                onChange={(e) => setNewSubFolderName(e.target.value)} 
                className="text-sm"
              />
              <Button size="sm" onClick={handleCreateSubFolder} disabled={isCreatingSubFolder || !newSubFolderName.trim()}>
                {isCreatingSubFolder ? <Loader2 className="h-4 w-4 animate-spin"/> : <FolderPlus className="h-4 w-4"/>}
              </Button>
            </div>
          </div>

          {selectedFolderForDialog && <p className="text-xs text-green-600 mt-2"><strong>Confirming to:</strong> {selectedFolderForDialog.path || selectedFolderForDialog.name}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
          <Button size="sm" onClick={handleSubmit} disabled={!selectedFolderForDialog}>
            Confirm & Integrate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Pending Reviews Page ---
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
        .map(t => {
          if (t.id === 'trans_2') return { ...t, actual_status: TRANSCRIPTION_STATUSES.DRAFT, progress: 75 };
          if (Math.random() < 0.3 && t.status !== TRANSCRIPTION_STATUSES.INTEGRATED && t.status !== TRANSCRIPTION_STATUSES.ARCHIVED) return { ...t, actual_status: TRANSCRIPTION_STATUSES.PROCESSING, progress: Math.floor(Math.random() * 90) + 10 };
          if (Math.random() < 0.2 && t.status !== TRANSCRIPTION_STATUSES.INTEGRATED && t.status !== TRANSCRIPTION_STATUSES.ARCHIVED) return { ...t, actual_status: "Awaiting Approval", progress: 100 };
          return { ...t, actual_status: t.status, progress: t.status === TRANSCRIPTION_STATUSES.INTEGRATED ? 100 : 0 };
        })
        .filter(t => t.actual_status !== TRANSCRIPTION_STATUSES.INTEGRATED && t.actual_status !== TRANSCRIPTION_STATUSES.ARCHIVED)
        .slice(0, 5);
      setPendingItems(currentPending);

      const historical = repoData.transcriptions
        .filter(t => t.status === TRANSCRIPTION_STATUSES.INTEGRATED || t.status === TRANSCRIPTION_STATUSES.ARCHIVED)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 4)
        .map(t => ({
          ...t,
          action_taken: t.status === TRANSCRIPTION_STATUSES.INTEGRATED ? "Approved & Integrated" : "Archived",
          action_date: t.updated_at,
          reviewed_by: "Admin User"
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
      setTimeSinceLastUpdateInSeconds(prevSeconds => prevSeconds + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [lastUpdateTime]);

  const handleRefreshQueue = () => {
    setIsRefreshingQueue(true);
    setTimeout(async () => {
      const repoData = await getMockRepositoryData(); 
      const currentPending = repoData.transcriptions 
        .map(t => {
          if (t.id === 'trans_2') return { ...t, actual_status: TRANSCRIPTION_STATUSES.DRAFT, progress: 75 };
          if (Math.random() < 0.3 && t.status !== TRANSCRIPTION_STATUSES.INTEGRATED && t.status !== TRANSCRIPTION_STATUSES.ARCHIVED) return { ...t, actual_status: TRANSCRIPTION_STATUSES.PROCESSING, progress: Math.floor(Math.random() * 90) + 10 };
          if (Math.random() < 0.2 && t.status !== TRANSCRIPTION_STATUSES.INTEGRATED && t.status !== TRANSCRIPTION_STATUSES.ARCHIVED) return { ...t, actual_status: "Awaiting Approval", progress: 100 };
          return { ...t, actual_status: t.status, progress: t.status === TRANSCRIPTION_STATUSES.INTEGRATED ? 100 : 0 };
        })
        .filter(t => t.actual_status !== TRANSCRIPTION_STATUSES.INTEGRATED && t.actual_status !== TRANSCRIPTION_STATUSES.ARCHIVED)
        .slice(0, 5 + Math.floor(Math.random() * 3 - 1)); 
      setPendingItems(currentPending);
      setLastUpdateTime(new Date());
      setIsRefreshingQueue(false);
    }, 1000);
  };


  const getStatusBadge = (status) => {
    switch (status) {
      case TRANSCRIPTION_STATUSES.DRAFT: return <Badge variant="outline" className="text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30">Draft</Badge>;
      case TRANSCRIPTION_STATUSES.PROCESSING: return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "Awaiting Approval": return <Badge variant="outline" className="text-purple-600 border-purple-500 bg-purple-50 dark:bg-purple-900/30"><Hourglass className="h-3 w-3 mr-1" />Awaiting Approval</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getHistoryActionBadge = (action) => {
    if (action.includes("Approved")) return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Approved</Badge>;
    if (action.includes("Archived")) return <Badge variant="outline">Archived</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  }


  if (isLoading) return <div className="p-8 text-center flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading pending reviews...</span></div>;


  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-left pl-3 pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">Pending Reviews & In-Progress</h1>
        <p className="text-md text-muted-foreground">Track transcriptions that are being processed or awaiting your review.</p>
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
                <Button variant="ghost" size="icon_sm" onClick={handleRefreshQueue} disabled={isRefreshingQueue}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshingQueue ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingItems.length === 0 && !isLoading && (
                <p className="text-muted-foreground text-sm text-center py-10 px-4">No items currently pending.</p>
              )}
              {pendingItems.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto relative">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="text-xs pl-4 pr-2">Title</TableHead>
                        <TableHead className="text-xs px-2 hidden sm:table-cell">Uploaded</TableHead>
                        <TableHead className="text-xs px-2">Status</TableHead>
                        <TableHead className="text-xs text-right pr-4 pl-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-xs py-2.5 pl-4 pr-2">{item.session_title}</TableCell>
                          <TableCell className="text-xs px-2 hidden sm:table-cell">{new Date(item.uploaded_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs px-2">{getStatusBadge(item.actual_status)}</TableCell>
                          <TableCell className="text-right pr-4 pl-2">
                            <Button variant="outline" size="xs" onClick={() => navigate(`/review`)}> 
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
              <CardTitle className="text-lg flex items-center gap-2"><History size={20} className="text-muted-foreground" />Review History</CardTitle>
              <CardDescription className="text-xs">Recently completed reviews.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyItems.length === 0 && !isLoading && (
                <p className="text-muted-foreground text-sm text-center py-10 px-4">No recent history.</p>
              )}
              {historyItems.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto relative">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="text-xs pl-4 pr-2">Title</TableHead>
                        <TableHead className="text-xs px-2 hidden sm:table-cell">Date</TableHead>
                        <TableHead className="text-xs text-right pr-4 pl-2">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-xs py-2 pl-4 pr-2 truncate max-w-[150px]">{item.session_title}</TableCell>
                          <TableCell className="text-xs px-2 hidden sm:table-cell">{new Date(item.action_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs text-right pr-4 pl-2">{getHistoryActionBadge(item.action_taken)}</TableCell>
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

// --- Edit Folder Dialog ---
const EditFolderDialog = ({ isOpen, onClose, folder, onSave }) => {
    const [name, setName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (folder) {
            setName(folder.name);
        }
    }, [folder]);

    if (!isOpen || !folder) return null; // Ensure dialog doesn't render if not open or no folder

    const handleSubmit = async () => {
        if (!name.trim()) {
            alert("Folder name cannot be empty.");
            return;
        }
        setIsSaving(true);
        try {
            await onSave(folder.id, name.trim());
            onClose(); // Close dialog on successful save
        } catch (error) {
            alert(`Error: ${error.message || "Could not save folder name."}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Folder Name</DialogTitle>
                    <DialogDescription>
                        Renaming folder: "{folder.name}".
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="editFolderNameInput" className="text-right">Name</Label>
                        <Input
                            id="editFolderNameInput"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="New folder name"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Transcription Repository Page Component ---
const RepositoryPage = () => {
  const [repositoryData, setRepositoryData] = useState({ folders: [], transcriptions: [] });
  const [selectedFolderId, setSelectedFolderId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState({ all: true }); 

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderNameRepo, setNewFolderNameRepo] = useState("");
  const [isCreatingRepoFolder, setIsCreatingRepoFolder] = useState(false);

  const [editingFolder, setEditingFolder] = useState(null);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);

  const location = useLocation();

  const fetchRepositoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMockRepositoryData();
      setRepositoryData(data);
    } catch (error) {
      console.error("Failed to fetch repository data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepositoryData();
  }, [fetchRepositoryData]);

  let pageTitle = "Transcription Repository";
  if (location.pathname === "/drafts") pageTitle = "Draft Transcriptions";
  if (location.pathname === "/archive") pageTitle = "Archived Transcriptions";

  const { folders: foldersToRender = [], transcriptions: transcriptionsToFilter = [] } = repositoryData;
  
  const filteredTranscriptions = transcriptionsToFilter.filter(t => {
    let inSelectedBranch = false;
    if (selectedFolderId === "all") {
      inSelectedBranch = true;
    } else {
      const selectedFolderObj = foldersToRender.find(f => f.id === selectedFolderId);
      if (selectedFolderObj) {
        let currentFolderForTranscription = foldersToRender.find(f_ => f_.id === t.folder_id);
        while(currentFolderForTranscription) {
          if (currentFolderForTranscription.id === selectedFolderId) {
            inSelectedBranch = true;
            break;
          }
          if (!currentFolderForTranscription.parent_id && currentFolderForTranscription.id !== selectedFolderId && selectedFolderId !== 'all') break;
          currentFolderForTranscription = foldersToRender.find(f_ => f_.id === currentFolderForTranscription.parent_id);
        }
      }
    }

    const matchesSearch = !searchTerm || 
                          t.session_title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.cleaned_transcript_text && t.cleaned_transcript_text.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (t.topics && t.topics.join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesStatus = true;
    if (location.pathname === "/drafts") {
        matchesStatus = t.status === TRANSCRIPTION_STATUSES.DRAFT;
    } else if (location.pathname === "/archive") {
        matchesStatus = t.status === TRANSCRIPTION_STATUSES.ARCHIVED;
    } else { 
        matchesStatus = t.status !== TRANSCRIPTION_STATUSES.DRAFT && t.status !== TRANSCRIPTION_STATUSES.ARCHIVED;
    }
    
    return inSelectedBranch && matchesSearch && matchesStatus;
  });

  const toggleFolder = (folderId) => {
    setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateRepoFolder = async () => {
    if (!newFolderNameRepo.trim()) {
      alert("Folder name cannot be empty.");
      return;
    }
    setIsCreatingRepoFolder(true);
    try {
      const parentFolder = foldersToRender.find(f => f.id === selectedFolderId);
      const parentIdForNewFolder = (selectedFolderId === "all" || !parentFolder) ? null : selectedFolderId;
      
      await mockCreateFolder(newFolderNameRepo.trim(), parentIdForNewFolder);
      setNewFolderNameRepo("");
      setIsCreateFolderModalOpen(false);
      await fetchRepositoryData();
    } catch (error) {
      console.error("Failed to create folder:", error);
      alert(`Error: ${error.message || "Could not create folder."}`);
    } finally {
      setIsCreatingRepoFolder(false);
    }
  };

  const handleOpenEditFolderModal = (folder, event) => {
    event.stopPropagation();
    setEditingFolder(folder);
    setIsEditFolderModalOpen(true);
  };

  const handleSaveEditedFolder = async (folderId, newName) => {
    setIsLoading(true); 
    try {
        await mockEditFolderName(folderId, newName);
        await fetchRepositoryData(); 
    } catch (error) {
        console.error("Failed to save edited folder name:", error);
        throw error; 
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteRepoFolder = async (folderIdToDelete, event) => {
    event.stopPropagation(); 
    const folder = foldersToRender.find(f => f.id === folderIdToDelete);
    if (!folder) return;

    if (window.confirm(`Are you sure you want to delete the folder "${folder.name}"? This action cannot be undone if the folder (and its subfolders) are empty of transcriptions.`)) {
      setIsLoading(true);
      try {
        await mockDeleteFolder(folderIdToDelete);
        let currentSelected = foldersToRender.find(f => f.id === selectedFolderId);
        let deletedBranch = false;
        if(currentSelected){
            let temp = currentSelected;
            while(temp){
                if(temp.id === folderIdToDelete){
                    deletedBranch = true;
                    break;
                }
                temp = foldersToRender.find(f => f.id === temp.parent_id);
            }
        }
        if (deletedBranch) {
             setSelectedFolderId(folder.parent_id || "all");
        }
        await fetchRepositoryData();
        alert(`Folder "${folder.name}" and its subfolders deleted successfully (if empty).`);
      } catch (error) {
        console.error("Failed to delete folder:", error);
        alert(`Error: ${error.message || "Could not delete folder. Make sure it and its subfolders are empty of transcriptions."}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderFolderTree = (currentFolders, parentIdToRender = null, level = 0) => {
    return currentFolders
      .filter(f => f.parent_id === parentIdToRender && f.id !== 'all') 
      .sort((a,b) => a.name.localeCompare(b.name))
      .map(folder => {
        const hasChildren = currentFolders.some(cf => cf.parent_id === folder.id);
        const isOpen = !!openFolders[folder.id];
        return (
          <div key={folder.id} className={`py-0.5 text-sm group relative`}>
             <div className={`flex items-center justify-between hover:bg-muted rounded ml-${level * 5}`}> {/* Increased Indentation */}
                <div
                    onClick={() => { setSelectedFolderId(folder.id); if (hasChildren) toggleFolder(folder.id); }}
                    className={`flex items-center gap-1.5 cursor-pointer p-1.5 flex-grow ${selectedFolderId === folder.id ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground'}`}
                >
                    {hasChildren ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-[14px] inline-block"></span>}
                    <FolderKanban size={14} className="text-muted-foreground" />
                    <span className="truncate max-w-[150px]">{folder.name}</span>
                    <span className="text-xs text-muted-foreground ml-1">({folder.count})</span>
                </div>
                {folder.id !== "all" && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon_xs" className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                <MoreHorizontal size={14} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={(e) => handleOpenEditFolderModal(folder, e)}>
                                <Pencil size={14} className="mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleDeleteRepoFolder(folder.id, e)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 size={14} className="mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            {hasChildren && isOpen && renderFolderTree(currentFolders, folder.id, level + 1)}
          </div>
        );
      });
  };
  
  const rootFolderForAll = foldersToRender.find(f => f.id === 'all');

  if (isLoading && !repositoryData.folders.length) return <div className="p-8 text-center flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading Repository...</span></div>;

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-left pl-3 pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">{pageTitle}</h1>
        <p className="text-md text-muted-foreground">Browse, organize, and search all stored transcriptions.</p>
        {selectedFolderId !== "all" && foldersToRender.find(f=>f.id === selectedFolderId)?.path && (
            <p className="text-xs text-muted-foreground mt-1">Current path: {foldersToRender.find(f=>f.id === selectedFolderId)?.path}</p>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Card className="w-full md:w-[280px] lg:w-[320px] flex-shrink-0 h-fit md:sticky md:top-24 pb-0">
          <CardHeader className="flex flex-row items-center justify-between w-full p-4">
            <CardTitle className="text-base">Folders</CardTitle>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon_sm" onClick={() => setIsCreateFolderModalOpen(true)}><PlusCircle size={16} /></Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Create New Folder</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent className="px-4 pb-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {rootFolderForAll && (
                 <div key={rootFolderForAll.id} className={`py-0.5 text-sm group relative`}>
                 <div className="flex items-center justify-between hover:bg-muted rounded">
                   <div
                     onClick={() => { setSelectedFolderId(rootFolderForAll.id); if (rootFolderForAll.id === 'all') toggleFolder('all');}}
                     className={`flex items-center gap-1.5 cursor-pointer p-1.5 flex-grow ${selectedFolderId === rootFolderForAll.id ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground'}`}
                   >
                     {openFolders[rootFolderForAll.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                     <FolderKanban size={14} className="text-muted-foreground" />
                     {rootFolderForAll.name} <span className="text-xs text-muted-foreground ml-1">({rootFolderForAll.count})</span>
                   </div>
                 </div>
                 {openFolders[rootFolderForAll.id] && (
                     <div className="ml-0"> {/* Wrapper for children of "All" to start their own level 0 indentation */}
                        {renderFolderTree(foldersToRender.filter(f => f.id !== 'all'), null, 0)}
                     </div>
                 )}
               </div>
            )}
          </CardContent>
        </Card>

        <div className="flex-grow space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:flex-grow">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search" placeholder="Search transcriptions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select defaultValue="processed_at">
                <SelectTrigger className="text-xs w-full sm:w-auto"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="processed_at" className="text-xs">Sort: Date Processed</SelectItem>
                  <SelectItem value="session_title" className="text-xs">Sort: Title</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="w-full sm:w-auto"><ListFilter className="h-3.5 w-3.5 mr-1.5" />Filters</Button>
            </div>
          </div>
          <Card className="overflow-hidden pb-0">
            <CardHeader>
              <CardTitle className="text-base">
                Transcriptions in {foldersToRender.find(f => f.id === selectedFolderId)?.name || (location.pathname === "/drafts" ? "Drafts" : location.pathname === "/archive" ? "Archive" : "All Repositories")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && filteredTranscriptions.length === 0 ? 
                <div className="text-center py-8 px-4"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div> :
              !isLoading && filteredTranscriptions.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8 px-4">No transcriptions found in this view.</p> :
              (
                <div className="max-h-[70vh] overflow-y-auto relative">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="text-xs whitespace-nowrap pl-4 pr-2">Title</TableHead>
                        <TableHead className="text-xs whitespace-nowrap px-2">Date</TableHead>
                        <TableHead className="text-xs whitespace-nowrap px-2">Purpose</TableHead>
                        <TableHead className="text-xs whitespace-nowrap px-2">Topics</TableHead>
                        <TableHead className="text-xs whitespace-nowrap px-2">Status</TableHead>
                        <TableHead className="text-xs text-right w-[60px] whitespace-nowrap pr-4 pl-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTranscriptions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium text-xs py-2.5 pl-4 pr-2">{t.session_title}<div className="text-xs text-muted-foreground font-normal">{t.source_file_name}</div></TableCell>
                          <TableCell className="text-xs py-2.5 px-2">{new Date(t.processed_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs py-2.5 px-2">{t.session_purpose}</TableCell>
                          <TableCell className="text-xs py-2.5 px-2">
                            <div className="flex flex-wrap gap-1">
                              {t.topics?.map(topicName => <span key={topicName} className="bg-muted text-muted-foreground text-[10px] py-0.5 px-1.5 rounded-full whitespace-nowrap">{topicName}</span>)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2.5 px-2">
                            <span className={`py-0.5 px-1.5 rounded-full text-[10px] font-medium whitespace-nowrap
                          ${t.status === 'Integrated' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300' :
                                t.status === 'Draft' ? 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300' :
                                  t.status === 'Archived' ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300' :
                                    'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300'}`}>
                              {t.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon_xs"><MoreHorizontal size={14} /></Button>
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
       <Dialog open={isCreateFolderModalOpen} onOpenChange={setIsCreateFolderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder under '{(selectedFolderId === "all" || !foldersToRender.find(f => f.id === selectedFolderId)) ? "Root" : foldersToRender.find(f => f.id === selectedFolderId)?.name || "Root"}'.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repoNewFolderNameInput" className="text-right">Name</Label>
              <Input
                id="repoNewFolderNameInput"
                value={newFolderNameRepo}
                onChange={(e) => setNewFolderNameRepo(e.target.value)}
                className="col-span-3"
                placeholder="New folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isCreatingRepoFolder}>Cancel</Button></DialogClose>
            <Button onClick={handleCreateRepoFolder} disabled={isCreatingRepoFolder || !newFolderNameRepo.trim()}>
              {isCreatingRepoFolder ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditFolderDialog 
        isOpen={isEditFolderModalOpen}
        onClose={() => setIsEditFolderModalOpen(false)}
        folder={editingFolder}
        onSave={handleSaveEditedFolder}
      />
    </div>
  );
};

// --- Admin Dashboard Page Component ---
const AdminDashboardPage = () => {
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    mockFetchAdminConflicts().then(data => { setConflicts(data); setIsLoading(false); });
  }, []);

  const summaryStats = isLoading ? {} : {
    pending: conflicts.filter(c => c.status === "Pending Review").length,
    resolved: conflicts.filter(c => c.status && c.status.startsWith("Resolved")).length,
    rejected: conflicts.filter(c => c.status && c.status.startsWith("Rejected")).length,
    total: conflicts.length,
  };

  const statCards = [
    { title: "Pending Review", value: summaryStats.pending, Icon: AlertTriangle, color: "text-yellow-500" },
    { title: "Resolved", value: summaryStats.resolved, Icon: CheckCircle, color: "text-green-500" },
    { title: "Rejected", value: summaryStats.rejected, Icon: XCircle, color: "text-red-500" },
    { title: "Total Items", value: summaryStats.total, Icon: ListFilter, color: "text-primary" },
  ];

  if (isLoading) return <div className="p-8 text-center flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading Admin Dashboard...</span></div>;

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 text-left pl-3 pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">Admin Dashboard</h1>
        <p className="text-md text-muted-foreground">Manage disputed content and resolve integration conflicts.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{stat.title}</CardTitle>
              <stat.Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle className="text-lg">Disputed Content & Anomalies</CardTitle>
          <CardDescription className="text-xs">Review and resolve conflicts between new and existing content.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-y-auto relative">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap pl-4 pr-2">New Content</TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">Existing Content</TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">Anomaly</TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">Date</TableHead>
                  <TableHead className="text-xs whitespace-nowrap px-2">Status</TableHead>
                  <TableHead className="text-xs text-right w-[80px] whitespace-nowrap pr-4 pl-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map(c => {
                  let anomalyBadgeClass = "text-[10px] py-0.5 px-1.5 rounded-full whitespace-nowrap ";
                  if (c.anomaly_type === "Semantic Difference") {
                    anomalyBadgeClass += "bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300";
                  } else if (c.anomaly_type === "Significant Overlap") {
                    anomalyBadgeClass += "bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300";
                  } else {
                    anomalyBadgeClass += "bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300";
                  }

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs py-2.5 pl-4 pr-2">
                        {c.new_transcription_title}
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.new_content_snippet}</div>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-2">
                        {c.existing_kb_document_id}
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.existing_content_snippet}</div>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-2">
                        <span className={anomalyBadgeClass}>{c.anomaly_type}</span>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 px-2">{new Date(c.flagged_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs py-2.5 px-2">
                        <span className={`py-0.5 px-1.5 rounded-full text-[10px] font-medium whitespace-nowrap
                  ${c.status === 'Pending Review' ? 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300' :
                            (c.status && c.status.startsWith('Resolved')) ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300' :
                              'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300'}`}>
                          {c.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4 pl-2">
                        <Button variant="outline" size="xs"><Eye size={12} className="mr-1" />Review</Button>
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


// --- Main App Component ---
function App() {
  const [processedDataForReview, setProcessedDataForReview] = useState(null);

  return (
    <Router>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <AppBar />
          <main className="flex-grow py-0 sm:py-2">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/upload" element={<UploadPage setProcessedDataForReview={setProcessedDataForReview} />} />
              <Route path="/review" element={<ReviewPage processedData={processedDataForReview} setProcessedDataForReview={setProcessedDataForReview} />} />
              <Route path="/pending-reviews" element={<PendingReviewsPage />} />
              <Route path="/repository" element={<RepositoryPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/drafts" element={<RepositoryPage />} />
              <Route path="/archive" element={<RepositoryPage />} />
            </Routes>
          </main>
        </div>
      </TooltipProvider>
    </Router>
  );
}

export default App;