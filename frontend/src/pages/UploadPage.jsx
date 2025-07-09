import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2 } from 'lucide-react';
import {
    Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { usePopup } from '@/components/PopupProvider';
import { createTranscription } from '@/services/apiClient';
import { SESSION_PURPOSES } from '@/lib/constants';


// --- CHILD COMPONENT 1: Metadata Form ---
const MetadataForm = forwardRef((props, ref) => {
    const [sessionTitle, setSessionTitle] = useState('');
    const [sessionPurpose, setSessionPurpose] = useState('');
    const [primaryTopic, setPrimaryTopic] = useState('');
    const [keywords, setKeywords] = useState('');
    const [keywordsError, setKeywordsError] = useState('');

    const validateKeywords = (text) => {
        if (!text.trim()) return true;
        const trimmedText = text.trim().replace(/,$/, '').trim();
        if (!trimmedText) return true;
        const pattern = /^[A-Z0-9\s]+\([^)]+\)(?:\s*,\s*[A-Z0-9\s]+\([^)]+\))*$/i;
        return pattern.test(trimmedText);
    };

    const handleKeywordsChange = (e) => {
        const input = e.target.value;
        setKeywords(input);
        if (input && !validateKeywords(input)) {
            setKeywordsError("Format must be: SHORTFORM(Full Form), NEXT(Full Form), ...");
        } else {
            setKeywordsError("");
        }
    };

    // --- NEW: Custom handler for the Select component ---
    const handlePurposeChange = (value) => {
        // If the user selects our special "clear" item, reset the state to an empty string.
        // Otherwise, set the state to the selected value.
        if (value === "__clear__") {
            setSessionPurpose("");
        } else {
            setSessionPurpose(value);
        }
    };

    useImperativeHandle(ref, () => ({
        getValues: () => ({
            sessionTitle,
            sessionPurpose,
            primaryTopic,
            keywords,
            keywordsError,
        }),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Context & Metadata</CardTitle>
                <CardDescription className="text-xs">
                    Provide context to improve transcription accuracy and content organization.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label htmlFor="sessionTitle" className="text-sm font-medium text-foreground mb-1.5 block">
                        Session Title <span className="text-xs text-muted-foreground">(Optional but Recommended)</span>
                    </label>
                    <Input id="sessionTitle" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="e.g., Q3 Project Phoenix Planning" />
                </div>
                <div>
                    <label htmlFor="sessionPurpose" className="text-sm font-medium text-foreground mb-1.5 block">Session Purpose</label>
                    {/* UPDATED: Use the new handler and a valid value for the clear option */}
                    <Select value={sessionPurpose} onValueChange={handlePurposeChange}>
                        <SelectTrigger className='w-full'><SelectValue placeholder="Select session purpose" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__clear__" className="text-muted-foreground italic">
                                Clear selection
                            </SelectItem>
                            {SESSION_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label htmlFor="primaryTopic" className="text-sm font-medium text-foreground mb-1.5 block">Primary Topic/Domain</label>
                    <Input id="primaryTopic" value={primaryTopic} onChange={(e) => setPrimaryTopic(e.target.value)} placeholder="e.g., 'CRM System Enhancements', 'Cloud Security'" />
                </div>
                <div>
                    <label htmlFor="keywords" className="text-sm font-medium text-foreground mb-1.5 block">Specific Keywords, Acronyms, or Jargon</label>
                    <Textarea id="keywords" value={keywords} onChange={handleKeywordsChange} placeholder="e.g., CSP(Cloud Service Provider), DB(Database)" rows={5} />
                    {keywordsError && <p className="text-xs text-red-600 mt-1.5">{keywordsError}</p>}
                    <p className="text-xs text-muted-foreground mt-1">This helps correct misinterpretations and ensures domain-specific terms are accurate.</p>
                </div>
            </CardContent>
        </Card>
    );
});


// --- CHILD COMPONENT 2: File Upload (No changes needed) ---
const FileUpload = forwardRef((props, ref) => {
    const [file, setFile] = useState(null);
    const handleFileChange = (e) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    useImperativeHandle(ref, () => ({
        getFile: () => file,
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">File Upload</CardTitle>
                <CardDescription className="text-xs">Select your audio or video file for processing</CardDescription>
            </CardHeader>
            <CardContent>
                <div className={`border-2 border-dashed border-muted text-center rounded-md cursor-pointer hover:border-primary transition-colors bg-muted/20 ${file ? 'p-5' : 'p-8'}`}
                    onClick={() => document.getElementById('fileInput')?.click()}>
                    <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-foreground font-medium">Click to upload or drag and drop</p>
                    <input type="file" id="fileInput" onChange={handleFileChange} className="hidden" />
                    {file && <p className="mt-2 text-xs text-green-600">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
                    <p className="text-xs text-muted-foreground mt-1">Maximum file size: 500MB</p>
                </div>
                <div className='mt-2 text-xs text-muted-foreground flex justify-between'>
                    <p>Audio: MP3, WAV, M4A, AAC, FLAC</p>
                    <p>Video: MP4, MOV, AVI, MKV, WMV</p>
                </div>
            </CardContent>
        </Card>
    );
});


// --- CHILD COMPONENT 3: Output Options (No changes needed) ---
const OutputOptions = forwardRef((props, ref) => {
    const [generateQuiz, setGenerateQuiz] = useState(false);

    useImperativeHandle(ref, () => ({
        getValues: () => ({ generateQuiz }),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Desired Outputs & Actions</CardTitle>
                <CardDescription className="text-xs">Choose what you'd like the system to generate and do with your content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Checkbox id="generateQuiz" checked={generateQuiz} onCheckedChange={(checked) => setGenerateQuiz(checked === true)} />
                    <label htmlFor="generateQuiz" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Generate Quiz/Mock Assignment
                    </label>
                </div>
            </CardContent>
        </Card>
    );
});


// --- PARENT COMPONENT: Upload Page (No changes needed) ---
export default function UploadPage() {
    const { alert } = usePopup();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);

    // Create refs to hold a reference to our child components
    const metadataRef = useRef();
    const fileUploadRef = useRef();
    const outputOptionsRef = useRef();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Get values from children components imperatively via refs
        const metadata = metadataRef.current.getValues();
        const file = fileUploadRef.current.getFile();
        const options = outputOptionsRef.current.getValues();

        if (metadata.keywordsError) {
            alert('Please correct the keyword format before submitting.');
            return;
        }

        if (!file) {
            alert('Please upload a file.');
            return;
        }

        if (!metadata.sessionTitle) {
            alert('Please provide a session title.');
            return;
        }

        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("media", file);
            formData.append("sessionTitle", metadata.sessionTitle);
            formData.append("sessionPurpose", metadata.sessionPurpose);
            formData.append("primaryTopic", metadata.primaryTopic);
            formData.append("source", file.name);
            formData.append("keywords", metadata.keywords);
            formData.append("generateQuiz", options.generateQuiz ? "true" : "false");

            createTranscription(formData);
            alert('Upload successful! Your file is being processed.', 'success');
            navigate('/pending-reviews');

        } catch (err) {
            console.error("Upload failed:", err)
            alert('Failed to process content. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-4 md:p-6 w-full">
            <div className="mb-6 text-left pl-3 pb-2">
                <h1 className="text-3xl font-semibold mb-1">Upload & Process Content</h1>
                <p className="text-md text-muted-foreground">
                    Upload your audio or video file and provide context for intelligent processing.
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        {/* Pass the ref to the child component */}
                        <MetadataForm ref={metadataRef} />
                    </div>
                    <div className="space-y-6">
                        <FileUpload ref={fileUploadRef} />
                        <OutputOptions ref={outputOptionsRef} />
                    </div>
                </div>
                <Button type="submit" size="lg" className="w-full mt-8" disabled={isProcessing}>
                    {isProcessing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                        'Transcribe & Process'
                    )}
                </Button>
            </form>
        </div>
    );
}