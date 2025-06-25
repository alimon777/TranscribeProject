import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, ListFilter, Ellipsis } from 'lucide-react';
import {
  mockFetchAdminConflicts,
  mockFetchConflictDetail,
  mockResolveConflict,
  ANOMALY_TYPES,
  CONFLICT_STATUSES,
} from '../mockData';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function AdminDashboardPage() {
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // for detail modal
  const [detail, setDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chosenContent, setChosenContent] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    mockFetchAdminConflicts().then((data) => {
      setConflicts(data);
      setIsLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    if (isLoading) return {};
    return {
      pending: conflicts.filter((c) => c.status === CONFLICT_STATUSES.PENDING).length,
      resolved: conflicts.filter((c) => c.status.startsWith('Resolved')).length,
      rejected: conflicts.filter((c) => c.status.startsWith('Rejected')).length,
      total: conflicts.length,
    };
  }, [conflicts, isLoading]);

  const cards = [
    { title: 'Pending Review', value: stats.pending, Icon: AlertTriangle, color: 'text-yellow-500' },
    { title: 'Resolved', value: stats.resolved, Icon: CheckCircle, color: 'text-green-500' },
    { title: 'Rejected', value: stats.rejected, Icon: XCircle, color: 'text-red-500' },
    { title: 'Total Items', value: stats.total, Icon: ListFilter, color: 'text-primary' },
  ];

  // open detail modal
  const openConflict = (id) => {
    setIsDetailLoading(true);
    setIsModalOpen(true);
    mockFetchConflictDetail(id).then((d) => {
      setDetail(d);
      setChosenContent(d?.resolutionNotes || '');
      setIsDetailLoading(false);
    });
  };

  const handleResolve = () => {
    if (!detail) return;
    setIsResolving(true);
    mockResolveConflict(detail.id, chosenContent).then(() => {
      // update local list
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === detail.id
            ? { ...c, status: CONFLICT_STATUSES.RESOLVED_MERGED }
            : c
        )
      );
      setIsResolving(false);
      setIsModalOpen(false);
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage disputed content and resolve integration conflicts.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((c) => (
            <Card key={c.title}>
              <CardHeader className="flex justify-between items-center pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">{c.title}</CardTitle>
                <c.Icon className={c.color} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Disputed Content & Anomalies</CardTitle>
            <CardDescription className="text-xs">
              Click a row to review or resolve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>New Content</TableHead>
                    <TableHead>Existing Content</TableHead>
                    <TableHead>Anomaly</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflicts.map((c) => {
                    let anomalyClass = 'text-[10px] py-0.5 px-1.5 rounded-full ';
                    if (c.anomaly_type === ANOMALY_TYPES.SEMANTIC_DIFFERENCE)
                      anomalyClass += 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300';
                    else if (c.anomaly_type === ANOMALY_TYPES.OVERLAP)
                      anomalyClass += 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300';
                    else anomalyClass += 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300';

                    let statusClass = 'py-0.5 px-1.5 rounded-full text-[10px] ';
                    if (c.status === CONFLICT_STATUSES.PENDING)
                      statusClass += 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300';
                    else if (c.status.startsWith('Resolved'))
                      statusClass += 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300';
                    else statusClass += 'bg-gray-100 text-gray-600';

                    return (
                      <TableRow 
                        key={c.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openConflict(c.id)}
                      >
                        <TableCell className="py-2">
                          {c.new_transcription_title}
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {c.new_content_snippet}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {c.existing_kb_document_id}
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {c.existing_content_snippet}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={anomalyClass}>{c.anomaly_type}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          {new Date(c.flagged_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={statusClass}>{c.status}</span>
                        </TableCell>
                        <TableCell className="text-right py-2 pr-6">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConflict(c.id);
                            }}
                          >
                            <Ellipsis size={12}/> 
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={() => setIsModalOpen(false)}>
        <DialogContent className="max-w-6xl min-w-[90vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {isDetailLoading
                ? 'Loading…'
                : detail
                  ? `Conflict: ${detail.id}`
                  : 'Conflict not found'}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading && (
            <div className="p-4 text-center">
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <Skeleton className="h-32 w-full mt-2" />
            </div>
          )}

          {!isDetailLoading && detail && (
            <>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="relative">
                  <div className="text-xs text-muted-foreground mb-2">
                    {detail.pathLeft.join(' / ')}
                  </div>
                  <div className="min-w-[300px] min-h-[200px] max-h-[400px] overflow-auto bg-muted/20 p-4 rounded border">
                    <pre className="text-sm whitespace-pre-wrap break-words">
                      {detail.existingContent}
                    </pre>
                  </div>
                  {detail.status === CONFLICT_STATUSES.PENDING && (
                    <div className="flex justify-end mt-2">
                      <span 
                        className={`text-sm cursor-pointer hover:underline ${
                          chosenContent === detail.existingContent ? 'text-primary font-medium' : 'text-primary'
                        }`}
                        onClick={() => setChosenContent(detail.existingContent)}
                      >
                        Keep Existing
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="text-xs text-muted-foreground mb-2">
                    {detail.pathRight.join(' / ')}
                  </div>
                  <div className="min-w-[300px] min-h-[200px] max-h-[400px] overflow-auto bg-muted/20 p-4 rounded border">
                    <pre className="text-sm whitespace-pre-wrap break-words">
                      {detail.incomingContent}
                    </pre>
                  </div>
                  {detail.status === CONFLICT_STATUSES.PENDING && (
                    <div className="flex justify-end mt-2">
                      <span 
                        className={`text-sm cursor-pointer hover:underline ${
                          chosenContent === detail.incomingContent ? 'text-primary font-medium' : 'text-primary'
                        }`}
                        onClick={() => setChosenContent(detail.incomingContent)}
                      >
                        Accept Incoming
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {detail.status === CONFLICT_STATUSES.PENDING ? (
                <div className="mb-4">
                  <div className="text-xs font-medium mb-1">Resolved Content:</div>
                  <Textarea
                    value={chosenContent}
                    onChange={(e) => setChosenContent(e.target.value)}
                    rows={6}
                    className="font-mono"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <div className="text-xs font-medium mb-1">Final Resolution:</div>
                  <pre className="bg-muted/20 p-2 rounded text-sm whitespace-pre-wrap">
                    {detail.resolutionNotes}
                  </pre>
                </div>
              )}

              <DialogFooter className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                {detail.status === CONFLICT_STATUSES.PENDING && (
                  <Button
                    onClick={handleResolve}
                    disabled={isResolving}
                  >
                    {isResolving ? 'Resolving…' : 'Resolve'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}