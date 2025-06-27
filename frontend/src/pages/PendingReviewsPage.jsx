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
import { Badge } from '@/components/ui/badge';
import { RefreshCw, History, Logs, Ellipsis } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { getPendingReviewTranscriptions, getReviewHistoryTranscriptions } from '../apiClient'; // Adjust path

const TRANSCRIPTION_STATUSES = {
    DRAFT: "Draft",
    INTEGRATED: "Integrated",
    PROCESSING: "Processing",
    ERROR: "Error",
};

export default function PendingReviewsPage() {
    const navigate = useNavigate();
    const [pendingItems, setPendingItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [elapsed, setElapsed] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [pendingData, historyData] = await Promise.all([
                    getPendingReviewTranscriptions(),
                    getReviewHistoryTranscriptions()
                ]);
                setPendingItems(pendingData);
                setHistoryItems(historyData);

                setLastUpdate(new Date());
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
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Failed to refresh pending items:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const renderHistoryBadge = (status) => {
        if (status === TRANSCRIPTION_STATUSES.INTEGRATED)
            return <StatusBadge status={TRANSCRIPTION_STATUSES.INTEGRATED} />;
        return <Badge variant="secondary">{status}</Badge>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full mt-6" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 w-full">
            <div className="mb-6">
                <h1 className="text-3xl font-semibold mb-1">
                    Pending Reviews & In-Progress
                </h1>
                <p className="text-muted-foreground">
                    Track transcriptions being processed or awaiting review.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row justify-between items-center pb-2">
                        <div className="flex items-center gap-2">
                             <Logs size={20} className="text-muted-foreground" />
                             <CardTitle className="text-lg">Current Queue</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                {elapsed}s ago
                            </span>
                            <Button
                                variant="ghost"
                                size="icon_sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pendingItems.length === 0 ? (
                            <p className="p-4 text-center text-muted-foreground">
                                No items currently pending.
                            </p>
                        ) : (
                            <div className="max-h-[60vh] overflow-y-auto p-4">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card z-10">
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            {/* Folder column REMOVED from Current Queue */}
                                            <TableHead>Uploaded</TableHead>
                                            <TableHead>Last Updated</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingItems.map((item) => (
                                            <TableRow key={item.id} onClick={() => navigate(`/review/${item.id}`)}>
                                                <TableCell className="font-medium truncate max-w-2xs">
                                                    {item.session_title}
                                                </TableCell>
                                                {/* TableCell for folder_name REMOVED */}
                                                <TableCell className="text-xs">
                                                    {formatDate(item.uploaded_at)}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {formatDateTime(item.updated_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={item.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History size={20} className="text-muted-foreground" />
                            <CardTitle className="text-lg">Review History</CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                            Recently completed reviews. Sorted by integration date.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {historyItems.length === 0 ? (
                            <p className="p-4 text-center text-muted-foreground">
                                No recent history.
                            </p>
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
                                            <TableRow key={item.id}>
                                                <TableCell className="flex-col">
                                                    <div className="truncate max-w-2xs font-medium"> {item.session_title}</div>
                                                    <div className="truncate max-w-2xs text-xs font-extralight"> {item.folder_path}</div>
                                                </TableCell>
                                                <TableCell className="text-xs text-right">
                                                    {formatDate(item.integrated_at)}
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
    );
}