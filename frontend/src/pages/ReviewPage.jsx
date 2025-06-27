import React, { useState, useEffect } from 'react';
// MODIFIED: Import useParams to get the ID from the URL
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, CheckCircle, Trash2, FileEdit, Download, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import IntegrationFolderDialog from '../components/IntegrationFolderDialog';
import { usePopup } from '../components/PopupProvider';
// MODIFIED: Import the new API function
import {
    saveTranscriptionAsDraft,
    finalizeTranscriptionIntegration,
    getTranscriptionDetails,
    deleteTranscription, // Optional, but good for a full "Discard" flow
} from '../apiClient';

// MODIFIED: The component no longer receives props for data
export default function ReviewPage() {
    const navigate = useNavigate();
    const { id: transcriptionId } = useParams(); // Get the ID from the URL
    const { confirm, alert } = usePopup();

    // MODIFIED: Component now manages its own data, loading, and error states
    const [transcriptionData, setTranscriptionData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedTranscription, setEditedTranscription] = useState('');
    const [editedQuiz, setEditedQuiz] = useState('');

    useEffect(() => {
        if (!transcriptionId) {
            navigate('/upload'); // Redirect if no ID is present
            return;
        }

        const fetchTranscription = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getTranscriptionDetails(transcriptionId);
                setTranscriptionData(data);
                setEditedTranscription(data.cleaned_transcript_text || '');
                setEditedQuiz(data.quiz_content || '');
            } catch (err) {
                console.error("Failed to fetch transcription details:", err);
                setError("Could not load the transcription for review. It may have been deleted or an error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTranscription();
    }, [transcriptionId, navigate]);

    const handleSaveDraft = async () => {
        setIsSaving(true);
        const updateData = {
            cleaned_transcript_text: editedTranscription,
            quiz_content: editedQuiz,
        };
        try {
            await saveTranscriptionAsDraft(transcriptionId, updateData);
            alert('Draft saved successfully!');
            navigate('/repository');
        } catch (err) {
            alert(err.detail || 'Failed to save draft.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = async (folderId) => {
        setIsFolderModalOpen(false);
        setIsSaving(true);
        const updateData = {
            cleaned_transcript_text: editedTranscription,
            quiz_content: editedQuiz,
        };
        try {
            const res = await finalizeTranscriptionIntegration(
                transcriptionId,
                folderId,
                updateData
            );
            alert(res.message || 'Integration finalized successfully!');
            navigate('/repository');
        } catch (err) {
            alert(err.detail || 'Failed to finalize integration.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = async () => {
        const ok = await confirm('Are you sure you want to discard this transcription? This action cannot be undone.');
        if (ok) {
            try {
                await deleteTranscription(transcriptionId);
                alert("Transcription discarded.");
                navigate('/upload');
            } catch (err) {
                alert("Failed to discard the transcription.");
            }
        }
    };

    // Loading and Error states
    if (isLoading) {
        return (
            <div className="p-8 text-center flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading Review Data...</span>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }

    if (!transcriptionData) {
        return null; // Should not happen if loading/error states are handled
    }


    return (
        <div className="p-4 md:p-6 w-full">
            {/* ... The rest of the JSX is largely the same, just using `transcriptionData` ... */}
            <div className="mb-6">
                <h1 className="text-3xl font-semibold mb-1">Review & Edit Generated Content</h1>
                <p className="text-md text-muted-foreground">Review the processed content before finalizing its integration.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 rounded-md shadow-sm">
                        <CheckCircle className="h-5 w-5 text-green-700" />
                        <p className="ml-2 text-sm text-green-700">Content ready for review.</p>
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Generated & Cleaned Transcription</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea value={editedTranscription} onChange={(e) => setEditedTranscription(e.target.value)} rows={15} className="font-mono whitespace-pre-wrap" />
                        </CardContent>
                    </Card>
                    {!!editedQuiz && (
                        <Card>
                            <CardHeader><CardTitle>Generated Quiz/Assignment</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea value={editedQuiz} onChange={(e) => setEditedQuiz(e.target.value)} rows={8} className="font-mono whitespace-pre-wrap" />
                            </CardContent>
                        </Card>
                    )}
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Session Information</CardTitle></CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-1.5">
                            <div><strong>Title:</strong> {transcriptionData.session_title}</div>
                            <div><strong>Purpose:</strong> {transcriptionData.session_purpose}</div>
                            <div><strong>Topics:</strong> {transcriptionData.topic_names?.join(', ') || 'N/A'}</div>
                            <div><strong>Processing Time:</strong> {Math.floor(transcriptionData.processing_time_seconds / 60)}m {transcriptionData.processing_time_seconds % 60}s</div>
                            <div><strong>Integrated In:</strong> {transcriptionData.folder_path}</div>
                            <div><strong>Status:</strong> {transcriptionData.status}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                        <CardContent className="space-y-2.5">
                            {!transcriptionData.folder_id
                                && <Button size="sm" className="w-full" onClick={() => setIsFolderModalOpen(true)} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save & Finalize Integration
                                </Button>
                            }
                            <Button size="sm" variant="outline" className="w-full" onClick={handleSaveDraft} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileEdit className="mr-2 h-4 w-4" />}
                                Save as Draft
                            </Button>
                            <Button size="sm" variant="outline" className="w-full" disabled><Download className="mr-2 h-4 w-4" />Download Content</Button>
                            <Button size="sm" variant="destructive" className="w-full" onClick={handleDiscard} disabled={isSaving}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Discard
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <IntegrationFolderDialog
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                onConfirm={handleFinalize}
            />
        </div>
    );
}