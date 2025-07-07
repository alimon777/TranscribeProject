import React, { useState, useEffect } from 'react';
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RefreshCw, History, Logs, FileEdit } from 'lucide-react';
import StatusBadge, { TRANSCRIPTION_STATUSES } from '../components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { getPendingReviewTranscriptions, getReviewHistoryTranscriptions } from '../services/apiClient';
import CardIllustration from '@/svg_components/CardsIllustration';


// --- Helper Components & Functions (Mostly Unchanged) ---

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
        return `${seconds}s ago`;
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

// --- NEW: Child Component for the Current Queue Card ---

function CurrentQueueCard({ initialItems }) {
    const navigate = useNavigate();
    const [pendingItems, setPendingItems] = useState(initialItems);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const pendingData = await getPendingReviewTranscriptions();
            setPendingItems(pendingData);
            setLastUpdate(new Date()); // Reset the timer
        } catch (error) {
            console.error("Failed to refresh pending items:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <Card className="lg:col-span-1 gap-0">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
                <div className="flex items-center gap-3">
                    <Logs size={20} className="text-muted-foreground" />
                    <div>
                    <CardTitle className="text-lg">Current Queue</CardTitle>
                        <CardDescription className="text-xs">
                            Items currently being processed or awaiting approval.
                        </CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ElapsedTimeDisplay lastUpdate={lastUpdate} />
                    <Button variant="ghost" size="icon_sm" onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {pendingItems.length === 0 ? (
                    <div className='flex-row justify-items-center'>
                        <CardIllustration className='h-50 w-50' />
                        <div className="text-muted-foreground -mt-12 text-sm">No items currently pending.</div>
                    </div>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Updated At</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.map((item) => {
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

// --- NEW: Child Component for the History & Drafts Card ---

function HistoryDraftsCard({ historyItems, draftItems }) {
    const navigate = useNavigate();
    const [rightCardMode, setRightCardMode] = useState('history');

    return (
        <Card className="lg:col-span-1 gap-0">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {rightCardMode === 'history' ? <History size={20} className="text-muted-foreground" /> : <FileEdit size={20} className="text-muted-foreground" />}
                        <div>
                            <CardTitle className="text-lg ">{rightCardMode === 'history' ? 'Review History' : 'Saved Drafts'}</CardTitle>
                            <CardDescription className="text-xs">
                                {rightCardMode === 'history' ? 'Recently integrated items.' : 'Items you have saved to finish later.'}
                            </CardDescription>
                        </div>
                    </div>
                    <ToggleGroup
                        type="single"
                        size="sm"
                        value={rightCardMode}
                        onValueChange={(value) => { if (value) setRightCardMode(value); }}
                    >
                        <ToggleGroupItem value="history" aria-label="View history">History</ToggleGroupItem>
                        <ToggleGroupItem value="drafts" aria-label="View drafts">Drafts</ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {rightCardMode === 'history' ? (
                    historyItems.length === 0 ? (
                        <div className='flex-row justify-items-center -mt-4'>
                            <CardIllustration className='h-50 w-50' />
                            <div className="text-muted-foreground -mt-12 text-sm">No recent history.</div>
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto p-4">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Updated At</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyItems.map((item) => (
                                        <TableRow key={item.id} onClick={() => navigate(`/transcription/${item.id}`)} className='cursor-pointer hover:bg-muted'>
                                            <TableCell className="flex-col">
                                                <div className="truncate max-w-2xs font-medium">{item.title}</div>
                                                <div className="truncate max-w-2xs text-xs text-muted-foreground">{item.folder_path}</div>
                                            </TableCell>
                                            <TableCell className="text-xs">{formatDateTime(item.updated_date)}</TableCell>
                                            <TableCell><StatusBadge status={item.status} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )
                ) : ( // Drafts View
                    draftItems.length === 0 ? (
                        <div className='flex-row justify-items-center -mt-4'>
                            <CardIllustration className='h-50 w-50' />
                            <div className="text-muted-foreground -mt-12 text-sm">No saved drafts.</div>
                        </div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto p-4">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Last Saved</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {draftItems.map((item) => (
                                        <TableRow key={item.id} onClick={() => navigate(`/transcription/${item.id}`)} className='cursor-pointer hover:bg-muted'>
                                            <TableCell className="font-medium truncate max-w-2xs">{item.title}</TableCell>
                                            <TableCell className="text-xs">{formatDateTime(item.updated_date)}</TableCell>
                                            <TableCell><StatusBadge status={item.status} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}


// --- REFACTORED: The Main Page Component ---

export default function PendingReviewsPage() {
    const [initialData, setInitialData] = useState({ pending: [], history: [], drafts: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [pendingData, combinedData] = await Promise.all([
                    getPendingReviewTranscriptions(),
                    getReviewHistoryTranscriptions(),
                ]);

                const filteredHistory = [];
                const filteredDrafts = [];
                combinedData.forEach(item => {
                    if (item.status === TRANSCRIPTION_STATUSES.INTEGRATED) {
                        filteredHistory.push(item);
                    } else if (item.status === TRANSCRIPTION_STATUSES.DRAFT) {
                        filteredDrafts.push(item);
                    }
                });

                setInitialData({
                    pending: pendingData,
                    history: filteredHistory,
                    drafts: filteredDrafts,
                });

            } catch (error) {
                console.error("Failed to fetch review data:", error);
                // Optionally set an error state here to show an error message
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 w-full">
                <div className="mb-6">
                    <Skeleton className="h-8 w-1/3 mb-2" />
                    <Skeleton className="h-5 w-1/2" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
                    <Card className="lg:col-span-1">
                        <CardHeader className='pb-2'><div className="flex justify-between items-center"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-6 w-1/4" /></div></CardHeader>
                        <CardContent className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent>
                    </Card>
                    <Card className="lg:col-span-1">
                        <CardHeader><div className="flex justify-between items-center"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-9 w-20" /></div><Skeleton className="h-4 w-full mt-1" /></CardHeader>
                        <CardContent className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 w-full">
            <div className="mb-6">
                <h1 className="text-3xl font-semibold mb-1">Pending Reviews & In-Progress</h1>
                <p className="text-muted-foreground">Track transcriptions being processed or awaiting review.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CurrentQueueCard initialItems={initialData.pending} />
                <HistoryDraftsCard historyItems={initialData.history} draftItems={initialData.drafts} />
            </div>
        </div>
    );
}