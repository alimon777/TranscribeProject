import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Trash2, FileEdit, Download, Save, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import IntegrationFolderDialog from '../components/IntegrationFolderDialog';
import { usePopup } from '../components/PopupProvider';
import StatusBadge, { TRANSCRIPTION_STATUSES } from '../components/StatusBadge';
import {
    finalizeTranscriptionIntegration,
    getTranscriptionDetails,
    deleteTranscription,
} from '../services/apiClient';

// --- Skeleton Component (Defined locally in this file) ---
function ReviewPageSkeleton() {
    return (
        <div className="p-4 md:p-6 w-full animate-pulse">
            {/* Header Skeleton */}
            <div className="mb-6 flex items-start gap-4">
                <Skeleton className="h-10 w-10 mt-1 flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-5 w-2/3" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Column Skeleton (Main Content) */}
                <div className="lg:col-span-3 space-y-6">
                    <Skeleton className="h-12 w-full" /> {/* Banner Skeleton */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/3" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 border-b pb-3">
                                <Skeleton className="h-10 w-1/3" />
                                <Skeleton className="h-10 w-1/3" />
                            </div>
                            <Skeleton className="h-72 w-full mt-4" /> {/* Textarea Skeleton */}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column Skeleton (Info and Actions) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-2 border-b pb-4 mb-4">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-1/3" />
                            </div>
                            <div>
                                <Skeleton className="h-5 w-1/4 mb-2" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-4/6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/2" />
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


// --- Main Page Component ---
export default function ReviewPage() {
    const navigate = useNavigate();
    const { id: transcriptionId } = useParams();
    const { confirm, alert } = usePopup();

    const [transcriptionData, setTranscriptionData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedTranscription, setEditedTranscription] = useState('');
    const [editedQuiz, setEditedQuiz] = useState('');
    // MODIFIED: State changed from string to object to handle key-value pairs
    const [provisionContent, setProvisionContent] = useState({});
    const [highlights, setHighlights] = useState('');

    useEffect(() => {
        if (!transcriptionId) {
            navigate('/upload');
            return;
        }

        const fetchTranscription = async () => {
            setError(null);
            try {
                const data = await getTranscriptionDetails(transcriptionId);
                setTranscriptionData(data);
                setEditedTranscription(data.transcript || '');
                setEditedQuiz(data.quiz_content || '');
                // MODIFIED: Handle object for provision_content, default to empty object
                setProvisionContent(data.provision_content || {});
                setHighlights(data.highlights || '');
            } catch (err) {
                console.error("Failed to fetch transcription details:", err);
                setError("Could not load the transcription for review. It may have been deleted or an error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTranscription();
    }, [transcriptionId, navigate]);

    const handleQuizAnswerChange = (index, newAnswer) => {
        setEditedQuiz(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], correct_answer: newAnswer };
            return updated;
        });
    };

    // MODIFIED: New handler to update a specific key in the provisionContent state
    const handleProvisionChange = (key, value) => {
        setProvisionContent(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        const updateData = {
            transcript: editedTranscription,
            quiz_content: editedQuiz,
            provision_content: provisionContent,
            highlights: highlights,
            status: TRANSCRIPTION_STATUSES.DRAFT
        };
        try {
            await finalizeTranscriptionIntegration(transcriptionId, updateData);
            alert('Draft saved successfully!');
            navigate('/pending-reviews'); // Navigate to pending reviews after saving draft
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
            transcript: editedTranscription,
            quiz_content: editedQuiz,
            provision_content: provisionContent,
            highlights: highlights,
            folder_id: folderId,
            status: TRANSCRIPTION_STATUSES.INTEGRATED
        };
        try {
            const res = await finalizeTranscriptionIntegration(
                transcriptionId,
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
                navigate('/pending-reviews');
            } catch (err) {
                alert("Failed to discard the transcription.");
            }
        }
    };

    if (isLoading) {
        return <ReviewPageSkeleton />;
    }

    if (error) { return <div className="p-8 text-center text-red-600">{error}</div>; }
    if (!transcriptionData) { return null; }

    const isIntegrated = transcriptionData.status === TRANSCRIPTION_STATUSES.INTEGRATED;
    const canFinalize = [TRANSCRIPTION_STATUSES.DRAFT, TRANSCRIPTION_STATUSES.AWAITING_APPROVAL].includes(transcriptionData.status);
    const canSaveAsDraft = transcriptionData.status === TRANSCRIPTION_STATUSES.AWAITING_APPROVAL;

    // MODIFIED: Removed dynamic grid class calculation as it's no longer needed and fragile.
    const hasProvisionContent = provisionContent && Object.keys(provisionContent).length > 0;

    return (
        <div className="p-4 md:p-6 w-full">
            <div className="mb-6 flex items-start gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 h-10 w-10 rounded-full mt-3" aria-label="Go back">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    {isIntegrated ? (
                        <>
                            <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                                <span>{transcriptionData.title}</span>
                                <StatusBadge status={transcriptionData.status} />
                            </h1>
                            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>{transcriptionData.folder_path || 'Uncategorized'}</span>
                                <span>•</span>
                                <span>{transcriptionData.source_file_name}</span>
                                <span>•</span>
                                <span>Processed on {new Date(transcriptionData.updated_date).toLocaleDateString()}</span>
                                <span>•</span>
                                <div className="flex flex-wrap gap-1">
                                    {transcriptionData.key_topics?.map((topic) => (
                                        <Badge key={topic} variant="outline" className="text-xs">{topic}</Badge>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h1 className="text-3xl font-semibold mb-1">Review & Edit Generated Content</h1>
                            <p className="text-md text-muted-foreground">Review the processed content before finalizing its integration.</p>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {!isIntegrated && transcriptionData.status === TRANSCRIPTION_STATUSES.AWAITING_APPROVAL && (
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 rounded-md shadow-sm">
                            <CheckCircle className="h-5 w-5" />
                            <p className="ml-2 text-sm font-medium">Content is ready for your review.</p>
                        </div>
                    )}
                    {!isIntegrated && transcriptionData.status === TRANSCRIPTION_STATUSES.DRAFT && (
                        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-4 rounded-md shadow-sm">
                            <FileEdit className="h-5 w-5" />
                            <p className="ml-2 text-sm font-medium">This is a saved draft awaiting final integration.</p>
                        </div>
                    )}

                    <Card>
                        <CardHeader><CardTitle>Content</CardTitle></CardHeader>
                        <CardContent>
                            <Tabs defaultValue="transcription" className="w-full">
                                {/* MODIFIED: TabsList now renders dynamic tabs for provision content */}
                                <TabsList className="h-auto flex-wrap">
                                    <TabsTrigger value="transcription">Transcription</TabsTrigger>
                                    {hasProvisionContent && Object.keys(provisionContent).map(key => (
                                        <TabsTrigger key={key} value={key}>{key}</TabsTrigger>
                                    ))}
                                    {!!editedQuiz && <TabsTrigger value="quiz">Quiz/Assignment</TabsTrigger>}
                                </TabsList>
                                <TabsContent value="transcription" className="mt-4">
                                    <Textarea value={editedTranscription} onChange={(e) => setEditedTranscription(e.target.value)} rows={20} className="max-h-[100vh] font-mono whitespace-pre-wrap" disabled={isIntegrated} />
                                </TabsContent>

                                {/* MODIFIED: Dynamically render TabsContent for each provision item */}
                                {hasProvisionContent && Object.entries(provisionContent).map(([key, value]) => (
                                    <TabsContent key={key} value={key} className="mt-4">
                                        <Textarea
                                            value={value || ''} // Use empty string for null values to avoid React errors
                                            onChange={(e) => handleProvisionChange(key, e.target.value)}
                                            rows={20}
                                            className="font-mono whitespace-pre-wrap max-h-[100vh]"
                                            disabled={isIntegrated}
                                        />
                                    </TabsContent>
                                ))}

                                {!!editedQuiz && (
                                    <TabsContent value="quiz" className="mt-4">
                                        <div className="max-h-[100vh] overflow-y-auto space-y-4 pr-2">
                                            {editedQuiz.map((item, index) => (
                                                <div key={index} className="border rounded-lg p-4 bg-muted/30">
                                                    <label className="font-semibold block mb-2">
                                                        Q{index + 1}: {item.question}
                                                    </label>

                                                    <ul className="list-disc pl-6 mb-2">
                                                        {item.choices.map((choice, idx) => (
                                                            <li
                                                                key={idx}
                                                                className={
                                                                    choice === item.correct_answer
                                                                        ? "font-semibold text-green-600"
                                                                        : ""
                                                                }
                                                            >
                                                                {choice}
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    <div className="mt-2">
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Correct Answer
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded px-2 py-1 mt-1"
                                                            value={item.correct_answer}
                                                            onChange={(e) => handleQuizAnswerChange(index, e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="text-sm">
                            {!isIntegrated && <>
                                <h4 className="font-semibold mb-3 text-primary ">Session Information</h4>
                                <div className="text-xs text-muted-foreground space-y-2 border-b pb-4 mb-4">
                                    <div><strong>Title:</strong> {transcriptionData.title}</div>
                                    <div><strong>Purpose:</strong> {transcriptionData.purpose}</div>
                                    <div><strong>Topics:</strong> {transcriptionData.key_topics?.join(', ') || 'N/A'}</div>
                                    <div className="flex items-center gap-2">
                                        <strong>Status:</strong> <StatusBadge status={transcriptionData.status} />
                                    </div>
                                </div></>}
                            {highlights && (
                                <div className="mt-4 p-2 rounded border bg-muted/20">
                                    <h4 className="font-semibold mb-2 text-primary">Highlights</h4>
                                    <div className={`${isIntegrated ? "max-h-[108vh]" : "max-h-[50vh]"} overflow-y-auto`}>
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{highlights}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {!isIntegrated && (
                        <Card>
                            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                            <CardContent className="space-y-2.5">
                                {canFinalize && (
                                    <Button size="sm" className="w-full" onClick={() => setIsFolderModalOpen(true)} disabled={isSaving}>
                                        Save & Finalize Integration
                                    </Button>
                                )}
                                {canSaveAsDraft && (
                                    <Button size="sm" variant="outline" className="w-full" onClick={handleSaveDraft} disabled={isSaving}>
                                        <Save className="mr-2 h-4 w-4" /> Save as Draft
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" className="w-full" disabled><Download className="mr-2 h-4 w-4" />Download Content</Button>
                                <Button size="sm" variant="destructive" className="w-full" onClick={handleDiscard} disabled={isSaving}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Discard
                                </Button>
                            </CardContent>
                        </Card>
                    )}
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