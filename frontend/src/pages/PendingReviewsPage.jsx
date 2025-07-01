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
import { RefreshCw, History, Logs, FileEdit } from 'lucide-react';
import StatusBadge, { TRANSCRIPTION_STATUSES } from '../components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { getPendingReviewTranscriptions, getReviewHistoryTranscriptions } from '../services/apiClient';
import CardIllustration from '@/svg_components/CardsIllustration';

const ACTIONABLE_STATUSES = [
    TRANSCRIPTION_STATUSES.DRAFT,
    TRANSCRIPTION_STATUSES.AWAITING_APPROVAL
];

export default function PendingReviewsPage() {
    const navigate = useNavigate();
    const [pendingItems, setPendingItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [draftItems, setDraftItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [elapsed, setElapsed] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [rightCardMode, setRightCardMode] = useState('history');

    // MODIFIED: This function now contains the filtering logic
    const processAndSetData = (pendingData, combinedHistoryAndDrafts) => {
        const filteredHistory = [];
        const filteredDrafts = [];

        combinedHistoryAndDrafts.forEach(item => {
            if (item.status === TRANSCRIPTION_STATUSES.INTEGRATED) {
                filteredHistory.push(item);
            } else if (item.status === TRANSCRIPTION_STATUSES.DRAFT) {
                filteredDrafts.push(item);
            }
        });

        setPendingItems(pendingData);
        setHistoryItems(filteredHistory);
        setDraftItems(filteredDrafts);
        setLastUpdate(new Date());
    };

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                // MODIFIED: Fetch only two data sources now
                const [pendingData, combinedData] = await Promise.all([
                    getPendingReviewTranscriptions(),
                    getReviewHistoryTranscriptions(),
                ]);
                processAndSetData(pendingData, combinedData);
            } catch (error) {
                console.error("Failed to fetch review data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        setElapsed(0);
        const id = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [lastUpdate]);

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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    // --- Skeleton loader remains the same and is correct ---
    if (isLoading) {
        return (
            <div className="p-4 md:p-6 w-full">
                <div className="mb-6">
                    <Skeleton className="h-8 w-1/3 mb-2" />
                    <Skeleton className="h-5 w-1/2" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-pulse">
                    <Card className="lg:col-span-3">
                        <CardHeader className='pb-2'>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-6 w-1/4" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-6 w-1/2" />
                                <Skeleton className="h-9 w-20" />
                            </div>
                            <Skeleton className="h-4 w-full mt-1" />
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row justify-between items-center pb-2">
                        <div className="flex items-center gap-2">
                            <Logs size={20} className="text-muted-foreground" />
                            <CardTitle className="text-lg">Current Queue</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{elapsed}s ago</span>
                            <Button variant="ghost" size="icon_sm" onClick={handleRefresh} disabled={isRefreshing}>
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pendingItems.length === 0 ? (
                            <div className='flex-row justify-items-center'>
                                <CardIllustration className='h-50 w-50'/>
                                <div className="text-muted-foreground -mt-12 text-sm">No items currently pending.</div>
                            </div>
                        ) : (
                            <div className="max-h-[60vh] overflow-y-auto p-4">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card z-10">
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Uploaded</TableHead>
                                            <TableHead>Last Updated</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingItems.map((item) => {
                                            const isActionable = ACTIONABLE_STATUSES.includes(item.status);
                                            return (
                                                <TableRow key={item.id} onClick={isActionable ? () => navigate(`/transcribe/review/${item.id}`) : undefined} className={isActionable ? 'cursor-pointer hover:bg-muted' : 'opacity-70 cursor-default'}>
                                                    <TableCell className="font-medium truncate max-w-2xs">{item.title}</TableCell>
                                                    <TableCell className="text-xs">{formatDate(item.uploaded_date)}</TableCell>
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

                <Card className="lg:col-span-2">
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
                            <Button className="cursor-pointer" variant="secondary" size="sm" onClick={() => setRightCardMode(prev => prev === 'history' ? 'drafts' : 'history')}>
                                {rightCardMode === 'history' ? 'Drafts' : 'History'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {rightCardMode === 'history' ? (
                            // History View
                            historyItems.length === 0 ? (
                                <div className='flex-row justify-items-center -mt-4'>
                                    <CardIllustration className='h-50 w-50'/>
                                    <div className="text-muted-foreground -mt-12 text-sm">No recent history.</div>
                                </div>
                            ) : (
                                <div className="max-h-[60vh] overflow-y-auto p-4">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card z-10">
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead className="text-right">Integrated</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historyItems.map((item) => (
                                                <TableRow key={item.id} onClick={() => navigate(`/transcription/${item.id}`)} className='cursor-pointer hover:bg-muted'>
                                                    <TableCell className="flex-col">
                                                        <div className="truncate max-w-2xs font-medium">{item.title}</div>
                                                        <div className="truncate max-w-2xs text-xs text-muted-foreground">{item.folder_path}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-right">{formatDate(item.updated_date)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        ) : (
                            // Drafts View
                            draftItems.length === 0 ? (
                                <div className='flex-row justify-items-center -mt-4'>
                                    <CardIllustration className='h-50 w-50'/>
                                    <div className="text-muted-foreground -mt-12 text-sm">No saved drafts.</div>
                                </div>
                            ) : (
                                <div className="max-h-[60vh] overflow-y-auto p-4">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card z-10">
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead className="text-right">Last Saved</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {draftItems.map((item) => (
                                                <TableRow key={item.id} onClick={() => navigate(`/transcription/${item.id}`)} className='cursor-pointer hover:bg-muted'>
                                                    <TableCell className="font-medium truncate max-w-2xs">{item.title}</TableCell>
                                                    <TableCell className="text-xs text-right">{formatDateTime(item.updated_date)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}