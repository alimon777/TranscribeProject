import React, { useState, useEffect } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import IllustrationCard from "../assets/Illustration_card.svg"

import {
  getAdminConflicts, // Renamed in backend: get_admin_conflicts_endpoint
  getConflictDetail,
  resolveConflict,
} from '../services/apiClient';

// Define string constants based on backend enums (values must match backend)
const LOCAL_ANOMALY_TYPES = {
  SEMANTIC_DIFFERENCE: "Semantic Difference",
  OVERLAP: "Significant Overlap",
  CONTRADICTION: "Contradiction",
  OUTDATED_INFO: "Outdated Information",
};

const LOCAL_CONFLICT_STATUSES = {
  PENDING: "Pending Review",
  RESOLVED_MERGED: "Resolved (Merged)",
  REJECTED: "Rejected",
};


export default function AdminDashboardPage() {
  const [conflicts, setConflicts] = useState([]);
  const [apiStats, setApiStats] = useState({ pending: 0, resolved: 0, rejected: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // for detail modal
  const [detail, setDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chosenContent, setChosenContent] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    // console.log("AdminDashboardPage useEffect running"); // For debugging StrictMode
    setIsLoading(true);
    getAdminConflicts() // This function name in apiClient.js maps to /admin/conflicts GET
      .then((data) => {
        setConflicts(data.conflicts || []);
        setApiStats(data.stats || { pending: 0, resolved: 0, rejected: 0, total: 0 });
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch admin conflicts:', error);
        setConflicts([]);
        setApiStats({ pending: 0, resolved: 0, rejected: 0, total: 0 });
        setIsLoading(false);
      });
  }, []); // Empty dependency array means this runs once on mount (or twice in StrictMode dev)

  const cards = [
    { title: 'Pending Review', value: apiStats.pending, Icon: AlertTriangle, color: 'text-yellow-500' },
    { title: 'Resolved', value: apiStats.resolved, Icon: CheckCircle, color: 'text-green-500' },
    { title: 'Rejected', value: apiStats.rejected, Icon: XCircle, color: 'text-red-500' },
    { title: 'Total Items', value: apiStats.total, Icon: ListFilter, color: 'text-primary' },
  ];

  const openConflict = (id) => {
    setIsDetailLoading(true);
    setIsModalOpen(true);
    setDetail(null);
    setChosenContent('');

    getConflictDetail(id)
      .then((data) => {
        setDetail(data);
        setChosenContent(data?.resolution_content || '');
        setIsDetailLoading(false);
      })
      .catch((error) => {
        console.error(`Failed to fetch conflict detail for ID ${id}:`, error);
        setIsDetailLoading(false);
      });
  };

  const handleResolve = () => {
    if (!detail) return;
    setIsResolving(true);

    const payload = {
      resolution_content: chosenContent,
      status: LOCAL_CONFLICT_STATUSES.RESOLVED_MERGED
    };

    resolveConflict(detail.id, payload)
      .then((response) => { // API now returns { resolved_conflict: {}, updated_stats: {} }
        const resolvedConflictData = response.resolved_conflict;
        const newStats = response.updated_stats;

        setConflicts((prev) =>
          prev.map((c) =>
            c.id === resolvedConflictData.id // Use ID from resolved_conflict
              ? { ...c, status: resolvedConflictData.status, resolution_content: resolvedConflictData.resolution_content }
              : c
          )
        );

        // Update stats directly from the resolveConflict response
        setApiStats(newStats || { pending: 0, resolved: 0, rejected: 0, total: 0 });

        setIsResolving(false);
        setIsModalOpen(false);
        setDetail(null);
      })
      .catch((error) => {
        console.error(`Failed to resolve conflict ID ${detail.id}:`, error);
        setIsResolving(false);
      });
  };

  // ... (rest of the component JSX remains the same)
  if (isLoading && conflicts.length === 0) {
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
                    if (c.anomaly_type === LOCAL_ANOMALY_TYPES.SEMANTIC_DIFFERENCE)
                      anomalyClass += 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300';
                    else if (c.anomaly_type === LOCAL_ANOMALY_TYPES.OVERLAP)
                      anomalyClass += 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300';
                    else anomalyClass += 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300';

                    let statusClass = 'py-0.5 px-1.5 rounded-full text-[10px] ';
                    if (c.status === LOCAL_CONFLICT_STATUSES.PENDING)
                      statusClass += 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300';
                    else if (c.status && c.status.startsWith('Resolved'))
                      statusClass += 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300';
                    else if (c.status && c.status.startsWith('Rejected'))
                      statusClass += 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300';
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
                          {c.existing_transcription_title}
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {c.existing_content_snippet}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className={anomalyClass}>{c.anomaly_type}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          {new Date(c.updated_date).toLocaleDateString()}
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
                            <Ellipsis size={12} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {isLoading && conflicts.length > 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">Refreshing list...</div>
            )}
            {!isLoading && conflicts.length === 0 && (
              <div className='flex-row justify-items-center'>
                <img src={IllustrationCard} className='h-30 w-30' />
                <div className="text-muted-foreground -mt-7 text-sm">No conflicts found.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={() => setIsModalOpen(false)}>
        <DialogContent className="max-w-6xl min-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isDetailLoading
                ? 'Loading Conflict Details…'
                : detail
                  ? `Conflict ID: ${detail.id}`
                  : 'Conflict Details Not Found'}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading && (
            <div className="p-4 text-center">
              <Skeleton className="h-6 w-1/2 mx-auto mb-4" />
              <Skeleton className="h-32 w-full mt-2 mb-2" />
              <Skeleton className="h-32 w-full mt-2" />
            </div>
          )}

          {!isDetailLoading && detail && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 flex-grow overflow-y-auto p-1">
                <div className="relative">
                  <div className="text-xs text-muted-foreground mb-2">
                    Existing: {detail.path_left}
                  </div>
                  <div className="min-w-[250px] min-h-[200px] max-h-[40vh] overflow-auto bg-muted/20 p-4 rounded border">
                    <pre className="text-sm whitespace-pre-wrap break-words">
                      {detail.existing_content_snippet}
                    </pre>
                  </div>
                  {detail.status === LOCAL_CONFLICT_STATUSES.PENDING && (
                    <div className="flex justify-end mt-2">
                      <span
                        className={`text-sm cursor-pointer hover:underline ${chosenContent === detail.existing_content_snippet ? 'text-primary font-medium' : 'text-primary'
                          }`}
                        onClick={() => setChosenContent(detail.existing_content_snippet || '')}
                      >
                        Keep Existing
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="text-xs text-muted-foreground mb-2">
                    Incoming: {detail.path_right}
                  </div>
                  <div className="min-w-[250px] min-h-[200px] max-h-[40vh] overflow-auto bg-muted/20 p-4 rounded border">
                    <pre className="text-sm whitespace-pre-wrap break-words">
                      {detail.new_content_snippet}
                    </pre>
                  </div>
                  {detail.status === LOCAL_CONFLICT_STATUSES.PENDING && (
                    <div className="flex justify-end mt-2">
                      <span
                        className={`text-sm cursor-pointer hover:underline ${chosenContent === detail.new_content_snippet ? 'text-primary font-medium' : 'text-primary'
                          }`}
                        onClick={() => setChosenContent(detail.new_content_snippet || '')}
                      >
                        Accept Incoming
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                {detail.status === LOCAL_CONFLICT_STATUSES.PENDING ? (
                  <>
                    <div className="text-xs font-medium mb-1">Edit Resolved Content / Notes:</div>
                    <Textarea
                      value={chosenContent}
                      onChange={(e) => setChosenContent(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </>
                ) : (
                  <>
                    <div className="text-xs font-medium mb-1">Final Resolution Notes:</div>
                    <pre className="bg-muted/20 p-2 rounded text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                      {detail.resolution_content}
                    </pre>
                  </>
                )}
              </div>

              <DialogFooter className="flex justify-end space-x-2 pt-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                {detail.status === LOCAL_CONFLICT_STATUSES.PENDING && (
                  <Button
                    onClick={handleResolve}
                    disabled={isResolving || !chosenContent.trim()}
                  >
                    {isResolving ? 'Resolving…' : 'Mark as Resolved'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
          {!isDetailLoading && !detail && (
            <div className="p-4 text-center text-muted-foreground">
              Could not load conflict details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}