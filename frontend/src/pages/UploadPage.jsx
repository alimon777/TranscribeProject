import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, InfoIcon, Loader2 } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePopup } from '@/components/PopupProvider';
import { createTranscription, updateTranscription } from '@/services/apiClient';

export default function UploadPage({ setProcessedDataForReview }) {
    const {alert} = usePopup();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [sessionTitle, setSessionTitle] = useState('');
    const [sessionPurpose, setSessionPurpose] = useState('');
    const [primaryTopic, setPrimaryTopic] = useState('');
    const [keywords, setKeywords] = useState('');
    const [generateQuiz, setGenerateQuiz] = useState(false);
    const SESSION_PURPOSES = [
        "General Walkthrough/Overview",
        "Requirements Gathering",
        "Technical Deep Dive",
        "Meeting Minutes",
        "Training Session",
        "Product Demo",
      ];
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file && !sessionTitle) {
            alert('Please provide a session title or upload a file.');
            return;
        }
        try {
            const formData = new FormData();
            formData.append("media", file);
            formData.append("sessionTitle", sessionTitle);
            formData.append("sessionPurpose", sessionPurpose);
            formData.append("primaryTopic", primaryTopic);
            formData.append("source", file.name);
            formData.append("keywords", keywords);
            formData.append("generateQuiz", generateQuiz.toString()); 
            
            createTranscription(formData, (data) => {
                const transcriptionId = data.transcription_id;
            });
            navigate('/pending-reviews');
        } catch {
            alert('Failed to process content.');
        }
    };

    return (
        <div className="p-4 md:p-6 w-full">
            <div className="mb-6 text-left pl-3 pb-2">
                <h1 className="text-3xl font-semibold mb-1">Upload & Process Content</h1>
                <p className="text-md text-muted-foreground">
                    Upload your audio or video file and provide context for intelligent
                    processing.
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <SelectTrigger className='w-full'>
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
                    CSP (Cloud Service Provider),
                    DB (DataBase),
                    ISP (Internet Service Provider)`}
                                        rows={5}
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
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-8"
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
            </form>
        </div>
    );
}