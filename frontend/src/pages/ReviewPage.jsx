import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, Trash2, FileEdit, Download, Save } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import IntegrationFolderDialog from '../components/IntegrationFolderDialog';
import { mockSaveAsDraft, mockFinalizeIntegration } from '../mockData';
import { usePopup } from '../components/PopupProvider';

export default function ReviewPage({ processedData, setProcessedDataForReview }) {
    const navigate = useNavigate();
    const { confirm } = usePopup();
    const { alert } = usePopup();
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedTranscription, setEditedTranscription] = useState('');
    const [editedQuiz, setEditedQuiz] = useState('');

    useEffect(() => {
        if (!processedData) {
            navigate('/upload');
            return;
        }
        setEditedTranscription(processedData.cleanedTranscription);
        setEditedQuiz(processedData.generatedQuiz || '');
    }, [processedData, navigate]);

    if (!processedData) {
        return (
            <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading review data...</span>
            </div>
        );
    }

    const { sessionInfo, knowledgeBaseIntegration, generateQuiz } = processedData;
    const currentData = {
        ...processedData,
        cleanedTranscription: editedTranscription,
        generatedQuiz: editedQuiz,
    };

    const handleSaveDraft = async () => {
        setIsLoading(true);
        try {
            const res = await mockSaveAsDraft(currentData);
            alert(res.message);
            setProcessedDataForReview(null);
            navigate('/repository');
        } catch {
            alert('Failed to save draft.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalize = async (folderId, pathArray) => {
        setIsFolderModalOpen(false);
        setIsLoading(true);
        try {
            const res = await mockFinalizeIntegration(currentData, {
                id: folderId,
                name: pathArray.pop() || 'Folder',
            });
            alert(res.message);
            setProcessedDataForReview(null);
            navigate('/repository');
        } catch {
            alert('Failed to finalize integration.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscard = async () => {
        const ok = await confirm('Discard changes?');
        if (ok) {
            setProcessedDataForReview(null);
            navigate('/upload');
        }
    };

    return (
        <div className="p-4 md:p-6 w-full">
            <div className="mb-6 text-center">
                <h1 className="text-3xl font-semibold mb-1">
                    Review & Edit Generated Content
                </h1>
                <p className="text-md text-muted-foreground">
                    Review the processed content before finalizing.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center bg-green-50 border-l-4 border-green-500 p-4 rounded">
                        <CheckCircle className="h-5 w-5 text-green-700" />
                        <p className="ml-2 text-sm text-green-700">
                            Content processing completed successfully.
                        </p>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Generated & Cleaned Transcription</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={editedTranscription}
                                onChange={(e) => setEditedTranscription(e.target.value)}
                                rows={15}
                                className="font-mono whitespace-pre-wrap"
                            />
                        </CardContent>
                    </Card>
                    {generateQuiz && editedQuiz && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Generated Quiz/Assignment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={editedQuiz}
                                    onChange={(e) => setEditedQuiz(e.target.value)}
                                    rows={8}
                                    className="font-mono whitespace-pre-wrap"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Session Information</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-1.5">
                            <div>
                                <strong>Title:</strong> {sessionInfo.title}
                            </div>
                            <div>
                                <strong>Purpose:</strong> {sessionInfo.purpose}
                            </div>
                            <div>
                                <strong>Domain:</strong> {sessionInfo.domain}
                            </div>
                            <div>
                                <strong>Processing Time:</strong> {sessionInfo.processingTime}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Knowledge Base Integration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-xs text-yellow-700">
                                {knowledgeBaseIntegration.suggestionText}
                            </div>
                            <div className="mt-2">
                                <strong>Proposed Location:</strong>
                                <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                                    {knowledgeBaseIntegration.proposedLocation.map((loc, i) => (
                                        <li key={i}>{loc}</li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            <Button
                                size="sm"
                                className="w-full"
                                onClick={() => setIsFolderModalOpen(true)}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
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
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <FileEdit className="mr-2 h-4 w-4" />
                                )}
                                Save as Draft
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                disabled
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download Content
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                className="w-full"
                                onClick={handleDiscard}
                                disabled={isLoading}
                            >
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
                suggestedPath={processedData.knowledgeBaseIntegration.proposedLocation}
            />
        </div>
    );
}