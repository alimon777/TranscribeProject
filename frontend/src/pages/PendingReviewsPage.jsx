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
import {  RefreshCw, History, Logs, Ellipsis } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getMockRepositoryData, TRANSCRIPTION_STATUSES } from '../mockData';
import { Skeleton } from '@/components/ui/skeleton';

export default function PendingReviewsPage() {
    const navigate = useNavigate();
    const [pendingItems, setPendingItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [elapsed, setElapsed] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        async function fetch() {
            const repo = await getMockRepositoryData();
            const pending = repo.transcriptions
                .map((t) => {
                    if (t.id === 'trans_2')
                        return {
                            ...t,
                            actual_status: TRANSCRIPTION_STATUSES.DRAFT,
                            progress: 75,
                        };
                    if (Math.random() < 0.3)
                        return {
                            ...t,
                            actual_status: TRANSCRIPTION_STATUSES.PROCESSING,
                            progress: Math.floor(Math.random() * 90) + 10,
                        };
                    if (Math.random() < 0.2)
                        return {
                            ...t,
                            actual_status: 'Awaiting Approval',
                            progress: 100,
                        };
                    return {
                        ...t,
                        actual_status: t.status,
                        progress:
                            t.status === TRANSCRIPTION_STATUSES.INTEGRATED ? 100 : 0,
                    };
                })
                .filter(
                    (t) =>
                        t.actual_status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
                        t.actual_status !== TRANSCRIPTION_STATUSES.ARCHIVED
                )
                .slice(0, 5);
            setPendingItems(pending);

            const history = repo.transcriptions
                .filter(
                    (t) =>
                        t.status === TRANSCRIPTION_STATUSES.INTEGRATED ||
                        t.status === TRANSCRIPTION_STATUSES.ARCHIVED
                )
                .sort(
                    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
                )
                .slice(0, 4)
                .map((t) => ({
                    ...t,
                    action_taken:
                        t.status === TRANSCRIPTION_STATUSES.INTEGRATED
                            ? 'Approved & Integrated'
                            : 'Archived',
                    action_date: t.updated_at,
                    reviewed_by: 'Admin User',
                }));
            setHistoryItems(history);
            setLastUpdate(new Date());
            setIsLoading(false);
        }
        fetch();
    }, []);

    useEffect(() => {
        setElapsed(0);
        const id = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [lastUpdate]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(async () => {
            const repo = await getMockRepositoryData();
            const pending = repo.transcriptions
                .map((t) => {
                    if (t.id === 'trans_2')
                        return {
                            ...t,
                            actual_status: TRANSCRIPTION_STATUSES.DRAFT,
                            progress: 75,
                        };
                    if (Math.random() < 0.3)
                        return {
                            ...t,
                            actual_status: TRANSCRIPTION_STATUSES.PROCESSING,
                            progress: Math.floor(Math.random() * 90) + 10,
                        };
                    if (Math.random() < 0.2)
                        return {
                            ...t,
                            actual_status: 'Awaiting Approval',
                            progress: 100,
                        };
                    return {
                        ...t,
                        actual_status: t.status,
                        progress:
                            t.status === TRANSCRIPTION_STATUSES.INTEGRATED ? 100 : 0,
                    };
                })
                .filter(
                    (t) =>
                        t.actual_status !== TRANSCRIPTION_STATUSES.INTEGRATED &&
                        t.actual_status !== TRANSCRIPTION_STATUSES.ARCHIVED
                )
                .slice(0, 5);
            setPendingItems(pending);
            setLastUpdate(new Date());
            setIsRefreshing(false);
        }, 1000);
    };

    const renderHistoryBadge = (action) => {
        if (action.includes('Approved'))
            return (
                <StatusBadge status={TRANSCRIPTION_STATUSES.INTEGRATED} />
            );
        if (action.includes('Archived'))
            return <StatusBadge status={TRANSCRIPTION_STATUSES.ARCHIVED} />;
        return <Badge variant="secondary">{action}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-48 w-full" />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex justify-between items-center pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Logs size={20} className="text-muted-foreground" />
                            Current Queue
                        </CardTitle>
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
                                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''
                                        }`}
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
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Uploaded</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    {item.session_title}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {new Date(item.uploaded_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={item.actual_status} />
                                                </TableCell>
                                                <TableCell className="text-right pr-7">
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => navigate('/review')}
                                                    >
                                                        <Ellipsis size={12}/>
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
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History size={20} className="text-muted-foreground" />
                            Review History
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Recently completed reviews.
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
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {historyItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="truncate max-w-xs">
                                                    {item.session_title}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {new Date(item.action_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {renderHistoryBadge(item.action_taken)}
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