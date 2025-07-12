import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RefreshCw, History, Logs, FileEdit, AlertTriangle } from 'lucide-react';
import { usePopup } from '../components/PopupProvider'; // <-- REPLACED: Import usePopup
import StatusBadge from '../components/StatusBadge';
import { TRANSCRIPTION_STATUSES } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { getPendingReviewTranscriptions, getApprovedDraftTranscriptions, getTranscriptionDetails } from '../services/apiClient';
import CardIllustration from '@/svg_components/CardsIllustration';


// --- Helper Components (Unchanged) ---
const ACTIONABLE_STATUSES = [
    TRANSCRIPTION_STATUSES.DRAFT,
    TRANSCRIPTION_STATUSES.AWAITING_APPROVAL
];

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
};

const formatElapsedTime = (seconds) => {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s ago`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
};

function ElapsedTimeDisplay({ lastUpdate }) {
    const [seconds, setSeconds] = useState(
        () => Math.floor((new Date() - new Date(lastUpdate)) / 1000)
    );

    useEffect(() => {
        setSeconds(Math.floor((new Date() - new Date(lastUpdate)) / 1000));
        const intervalId = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(intervalId);
    }, [lastUpdate]);

    return (
        <span className="text-xs text-muted-foreground">
            {formatElapsedTime(seconds)}
        </span>
    );
}

function CurrentQueueCard({ items, onRefresh, isRefreshing, lastUpdate }) {
    const navigate = useNavigate();

    return (
        <Card className="lg:col-span-1 gap-0 pb-0">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
                <div className="flex items-center gap-3">
                    <Logs size={20} className="text-blue-500" />
                    <div>
                        <CardTitle className="text-lg">Current Queue</CardTitle>
                        <CardDescription className="text-xs">
                            Items being processed or awaiting approval.
                        </CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ElapsedTimeDisplay lastUpdate={lastUpdate} />
                    <Button variant="ghost" size="icon_sm" onClick={onRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {items.length === 0 ? (
                    <div className='flex flex-col items-center justify-center p-8 text-center'>
                        <CardIllustration className='h-48 w-48' />
                        <p className="text-muted-foreground -mt-10 text-sm">No items currently pending.</p>
                    </div>
                ) : (
                    <div className="h-[45vh] overflow-y-auto p-4 pt-0">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Updated At</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => {
                                    const isActionable = ACTIONABLE_STATUSES.includes(item.status);
                                    return (
                                        <TableRow key={item.id} onClick={isActionable ? () => navigate(`/transcription/${item.id}`) : undefined} className={isActionable ? 'cursor-pointer hover:bg-muted' : 'opacity-70 cursor-default'}>
                                            <TableCell className="font-medium truncate max-w-2xs">{item.title}</TableCell>
                                            <TableCell className="text-xs">{formatDateTime(item.updated_date)}</TableCell>
                                            <TableCell><StatusBadge status={item.status} /></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


// --- IntegratedDraftsConflictsCard (Unchanged) ---
function IntegratedDraftsConflictsCard({ historyItems, draftItems, conflictItems }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('history');

    const cardConfig = {
        history: {
            icon: <History size={20} className="text-green-500" />,
            title: 'Review Integrated',
            description: 'Successfully integrated items.',
            items: historyItems,
            emptyMessage: 'No recent history.',
            dateLabel: 'Updated At',
        },
        drafts: {
            icon: <FileEdit size={20} className="text-yellow-500" />,
            title: 'Saved Drafts',
            description: 'Items you have saved to finish later.',
            items: draftItems,
            emptyMessage: 'No saved drafts.',
            dateLabel: 'Last Saved',
        },
        conflicts: {
            icon: <AlertTriangle size={20} className="text-destructive" />,
            title: 'Processing Conflicts',
            description: 'Items that needs to be resolved by admin',
            items: conflictItems,
            emptyMessage: 'No processing conflicts.',
            dateLabel: 'Updated At',
        },
    };

    const currentView = cardConfig[activeTab];

    return (
        <Card className="lg:col-span-1 gap-0 pb-0">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {currentView.icon}
                        <div>
                            <CardTitle className="text-lg">{currentView.title}</CardTitle>
                            <CardDescription className="text-xs">
                                {currentView.description}
                            </CardDescription>
                        </div>
                    </div>
                    <ToggleGroup
                        type="single"
                        size="sm"
                        value={activeTab}
                        onValueChange={(value) => { if (value) setActiveTab(value); }}
                    >
                        <ToggleGroupItem value="history" aria-label="View history" className="px-3 cursor-pointer">Integrated</ToggleGroupItem>
                        <ToggleGroupItem value="drafts" aria-label="View drafts" className="px-0 cursor-pointer">Drafts</ToggleGroupItem>
                        <ToggleGroupItem value="conflicts" aria-label="View conflicts" className="px-2 cursor-pointer">Conflicts</ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {currentView.items.length === 0 ? (
                    <div className='flex flex-col items-center justify-center p-8 text-center'>
                        <CardIllustration className='h-48 w-48' />
                        <p className="text-muted-foreground -mt-10 text-sm">{currentView.emptyMessage}</p>
                    </div>
                ) : (
                    <div className="h-[45vh] overflow-y-auto p-4 pt-0">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>{currentView.dateLabel}</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentView.items.map((item) => (
                                    <TableRow key={item.id} onClick={() => navigate(`/transcription/${item.id}`)} className='cursor-pointer hover:bg-muted'>
                                        <TableCell className="flex-col">
                                            <div className="truncate max-w-2xs font-medium">{item.title}</div>
                                            {/* {item.folder_path && <div className="truncate max-w-2xs text-xs text-muted-foreground">{item.folder_path}</div>} */}
                                        </TableCell>
                                        <TableCell className="text-xs">{formatDateTime(item.updated_date)}</TableCell>
                                        <TableCell><StatusBadge status={item.status} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- REFACTORED: The Main Page Component using `usePopup` ---
export default function PendingReviewsPage() {
    const [transcriptionData, setTranscriptionData] = useState({ pending: [], history: [], drafts: [], conflicts: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const { alert } = usePopup(); // <-- REPLACED: Initialize popup hook

    const fetchData = async () => {
        try {
            const [pendingData, otherData] = await Promise.all([
                getPendingReviewTranscriptions(),
                getApprovedDraftTranscriptions(),
            ]);

            const filteredHistory = otherData.filter(item => item.status === TRANSCRIPTION_STATUSES.INTEGRATED);
            const filteredDrafts = otherData.filter(item => item.status === TRANSCRIPTION_STATUSES.DRAFT);
            const filteredConflicts = otherData.filter(item => item.status === TRANSCRIPTION_STATUSES.ERROR);

            setTranscriptionData({
                pending: pendingData,
                history: filteredHistory,
                drafts: filteredDrafts,
                conflicts: filteredConflicts,
            });
            setLastUpdate(new Date());

        } catch (error) {
            console.error("Failed to fetch review data:", error);
            alert("Error: Could not fetch transcription data."); // <-- REPLACED
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchData().finally(() => setIsLoading(false));
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    };

    const itemsToPoll = useMemo(() =>
        transcriptionData.pending.filter(item =>
            item.status === TRANSCRIPTION_STATUSES.PROCESSING ||
            item.status === TRANSCRIPTION_STATUSES.FINALIZING
        ), [transcriptionData.pending]);

    // --- REFINED POLLING LOGIC with usePopup ---
    useEffect(() => {
        if (itemsToPoll.length === 0) return;

        const intervalId = setInterval(async () => {
            const pollPromises = itemsToPoll.map(item => getTranscriptionDetails(item.id));
            const results = await Promise.allSettled(pollPromises);

            let hasChanges = false;
            setTranscriptionData(currentData => {
                const newState = {
                    pending: [...currentData.pending],
                    history: [...currentData.history],
                    drafts: [...currentData.drafts],
                    conflicts: [...currentData.conflicts],
                };

                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        const updatedItem = result.value;
                        const originalItem = itemsToPoll[index];

                        if (originalItem.status !== updatedItem.status) {
                            hasChanges = true;

                            const itemIndexInPending = newState.pending.findIndex(p => p.id === updatedItem.id);
                            if (itemIndexInPending === -1) return;

                            const [movedItem] = newState.pending.splice(itemIndexInPending, 1);
                            const finalItem = { ...movedItem, ...updatedItem };

                            // Flow 1: Finalizing -> Integrated
                            if (originalItem.status === TRANSCRIPTION_STATUSES.FINALIZING && updatedItem.status === TRANSCRIPTION_STATUSES.INTEGRATED) {
                                newState.history.unshift(finalItem);
                                alert(`Integrated: "${finalItem.title}" is complete.`); // <-- REPLACED
                            }
                            // Flow 2: Finalizing -> Error
                            else if (originalItem.status === TRANSCRIPTION_STATUSES.FINALIZING && updatedItem.status === TRANSCRIPTION_STATUSES.ERROR) {
                                newState.conflicts.unshift(finalItem);
                                alert(`Conflicts Found: "${finalItem.title}" needs resolution.`); // <-- REPLACED
                            }
                            // Flow 3: Processing -> Awaiting Approval
                            else if (originalItem.status === TRANSCRIPTION_STATUSES.PROCESSING && updatedItem.status === TRANSCRIPTION_STATUSES.AWAITING_APPROVAL) {
                                newState.pending.splice(itemIndexInPending, 0, finalItem);
                                alert(`Ready for Review: "${finalItem.title}" is awaiting approval.`); // <-- REPLACED
                            }
                            else {
                                newState.pending.splice(itemIndexInPending, 0, finalItem);
                            }
                        }
                    }
                });

                if (hasChanges) {
                    newState.history.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
                    newState.conflicts.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
                    return newState;
                }

                return currentData;
            });
        }, 10000);

        return () => clearInterval(intervalId);

    }, [itemsToPoll]); 

    return (
        <div className="pt-4 md:p-6 w-full mb-10">
            <div className="mb-6">
                <h1 className="text-3xl font-semibold mb-1">Pending Reviews & In-Progress</h1>
                <p className="text-muted-foreground">Track transcriptions being processed or awaiting review.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CurrentQueueCard
                    items={transcriptionData.pending}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    lastUpdate={lastUpdate}
                />
                <IntegratedDraftsConflictsCard
                    historyItems={transcriptionData.history}
                    draftItems={transcriptionData.drafts}
                    conflictItems={transcriptionData.conflicts}
                />
            </div>
        </div>
    );
}