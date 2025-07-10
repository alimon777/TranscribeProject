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
import { AlertTriangle, CheckCircle, XCircle, ListFilter, Ellipsis, FilterX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  getAdminConflicts,
  getConflictDetail,
  resolveConflict,
  rejectConflict,
} from '../services/apiClient';
import { usePopup } from '../components/PopupProvider';
import CardIllustration from '@/svg_components/CardsIllustration';
import { LOCAL_ANOMALY_TYPES, LOCAL_CONFLICT_STATUSES } from '@/lib/constants';

const AdminDashboardSkeleton = () => {
  return (
    <div className="p-4 md:p-6 w-full animate-pulse">
      <div className="mb-6">
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-5 w-1/2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/3 mt-2" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                <TableHead><Skeleton className="h-5 w-full" /></TableHead>
                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-6 w-8 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-2 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </TableCell>
                  <TableCell className="py-2 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </TableCell>
                  <TableCell className="py-2">
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="py-2">
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="py-2">
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right py-2 pr-6">
                    <Skeleton className="h-6 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [conflicts, setConflicts] = useState([]);
  const [apiStats, setApiStats] = useState({ pending: 0, resolved: 0, rejected: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { alert, confirm } = usePopup();
  const [detail, setDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chosenContent, setChosenContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStatusFilters, setActiveStatusFilters] = useState(new Set());

  useEffect(() => {
    setIsLoading(true);
    const params = {
      status_filters: activeStatusFilters.size > 0 ? Array.from(activeStatusFilters).join(',') : undefined,
    };
    console.log("it is getting called", params)
    getAdminConflicts(params)
      .then((data) => {
        setConflicts(data.conflicts || []);
        setApiStats(data.stats || { pending: 0, resolved: 0, rejected: 0, total: 0 });
      })
      .catch((error) => {
        console.error('Failed to fetch admin conflicts:', error);
        alert(`Failed to load conflicts: ${error.detail || error.message}`);
        setConflicts([]);
        setApiStats({ pending: 0, resolved: 0, rejected: 0, total: 0 });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeStatusFilters]);

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
      })
      .catch((error) => {
        console.error(`Failed to fetch conflict detail for ID ${id}:`, error);
        alert(`Failed to load details: ${error.detail || error.message}`);
      })
      .finally(() => {
        setIsDetailLoading(false);
      });
  };

  const handleResolve = () => {
    if (!detail) return;
    setIsSubmitting(true);

    const payload = {
      resolution_content: chosenContent,
      status: LOCAL_CONFLICT_STATUSES.RESOLVED_MERGED
    };

    resolveConflict(detail.id, payload)
      .then((response) => {
        const resolvedConflictData = response.resolved_conflict;
        const newStats = response.updated_stats;
        const message = response?.message;
        setConflicts((prev) => prev.filter((c) => c.id !== resolvedConflictData.id));
        setApiStats(newStats || apiStats);
        if (message)
          alert(`Conflict resolved and ${message} integrated successfully.`);
        else
          alert('Conflict resolved successfully.');
        setIsModalOpen(false);
        setDetail(null);
      })
      .catch((error) => {
        console.error(`Failed to resolve conflict ID ${detail.id}:`, error);
        alert(`Resolution failed: ${error.detail || error.message}`);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleReject = async () => {
    if (!detail) return;
    const ok = await confirm('Are you sure you want to reject this conflict? This cannot be undone.');
    if (!ok) return;

    setIsSubmitting(true);
    rejectConflict(detail.id)
      .then((response) => {
        const rejectedConflictData = response.rejected_conflict;
        const newStats = response.updated_stats;
        const message = response?.message;
        setConflicts((prev) => prev.filter((c) => c.id !== rejectedConflictData.id));
        setApiStats(newStats || apiStats);
        if (message)
          alert(`Conflict rejected and ${message} integrated successfully.`);
        else
          alert('Conflict has been rejected.');
        setIsModalOpen(false);
        setDetail(null);
      })
      .catch((error) => {
        console.error(`Failed to reject conflict ID ${detail.id}:`, error);
        alert(`Rejection failed: ${error.detail || error.message}`);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleStatusFilterChange = (status, checked) => {
    setActiveStatusFilters((prevFilters) => {
      const newFilters = new Set(prevFilters);
      if (checked) newFilters.add(status);
      else newFilters.delete(status);
      return newFilters;
    });

  };

  if (isLoading && conflicts.length === 0) {
    return <AdminDashboardSkeleton />;
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
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>
                Disputed Content & Anomalies
                {activeStatusFilters.size > 0 && (
                  <Badge variant="secondary" className="ml-2 font-normal text-xs align-middle">
                    {activeStatusFilters.size} Filter{activeStatusFilters.size > 1 ? 's' : ''} Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                Click a row to review or resolve.
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="relative ml-auto flex h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  {activeStatusFilters.size > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] items-center justify-center">{activeStatusFilters.size}</span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.values(LOCAL_CONFLICT_STATUSES).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={activeStatusFilters.has(status)}
                    onCheckedChange={(checked) => handleStatusFilterChange(status, Boolean(checked))}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
                {activeStatusFilters.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setActiveStatusFilters(new Set()); }}>
                      <FilterX className="h-4 w-4 mr-2" />
                      Clear Status Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {conflicts.length > 0 ? (
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
                      if (c.anomaly_type === LOCAL_ANOMALY_TYPES.SEMANTIC_DIFFERENCE) anomalyClass += 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300';
                      else if (c.anomaly_type === LOCAL_ANOMALY_TYPES.OVERLAP) anomalyClass += 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300';
                      else anomalyClass += 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300';

                      let statusClass = 'py-0.5 px-1.5 rounded-full text-[10px] ';
                      if (c.status === LOCAL_CONFLICT_STATUSES.PENDING) statusClass += 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300';
                      else if (c.status?.startsWith('Resolved')) statusClass += 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300';
                      else if (c.status?.startsWith('Rejected')) statusClass += 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300';
                      else statusClass += 'bg-gray-100 text-gray-600';

                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openConflict(c.id)}>
                          <TableCell className="py-2">
                            {c.new_transcription_title}
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.new_content_snippet}</div>
                          </TableCell>
                          <TableCell className="py-2">
                            {c.existing_transcription_title}
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.existing_content_snippet}</div>
                          </TableCell>
                          <TableCell className="py-2"><span className={anomalyClass}>{c.anomaly_type}</span></TableCell>
                          <TableCell className="py-2">{new Date(c.updated_date).toLocaleDateString()}</TableCell>
                          <TableCell className="py-2"><span className={statusClass}>{c.status}</span></TableCell>
                          <TableCell className="text-right py-2 pr-6">
                            <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); openConflict(c.id); }}>
                              <Ellipsis size={12} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className='flex-row justify-items-center text-center p-8'>
                <CardIllustration className='h-40 w-40 inline-block' />
                <div className="text-muted-foreground text-sm mt-4">No conflicts found matching your criteria.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={() => setIsModalOpen(false)}>
        <DialogContent className="max-w-6xl min-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isDetailLoading ? 'Loading Conflict Details…' : detail ? `Conflict ID: ${detail.id}` : 'Conflict Details Not Found'}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading && ( <div className="p-4 text-center"> <Skeleton className="h-6 w-1/2 mx-auto mb-4" /> <Skeleton className="h-32 w-full mt-2 mb-2" /> <Skeleton className="h-32 w-full mt-2" /> </div> )}

          {!isDetailLoading && detail && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 flex-grow overflow-y-auto p-1">
                <div className="relative">
                  <div className="text-xs text-muted-foreground mb-2"> Existing: {detail.path_left} </div>
                  <div className="min-w-[250px] min-h-[200px] max-h-[40vh] overflow-auto bg-muted/20 p-4 rounded border">
                    <pre className="text-sm whitespace-pre-wrap break-words">{detail.existing_content_snippet}</pre>
                  </div>
                  {detail.status === LOCAL_CONFLICT_STATUSES.PENDING && (
                    <div className="flex justify-end mt-2">
                      <span className={`text-sm cursor-pointer hover:underline ${chosenContent === detail.existing_content_snippet ? 'text-primary font-medium' : 'text-primary'}`} onClick={() => setChosenContent(detail.existing_content_snippet || '')}> Keep Existing </span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="text-xs text-muted-foreground mb-2"> Incoming: {detail.path_right} </div>
                  <div className="min-w-[250px] min-h-[200px] max-h-[40vh] overflow-auto bg-muted/20 p-4 rounded border">
                    <pre className="text-sm whitespace-pre-wrap break-words">{detail.new_content_snippet}</pre>
                  </div>
                  {detail.status === LOCAL_CONFLICT_STATUSES.PENDING && (
                    <div className="flex justify-end mt-2">
                      <span className={`text-sm cursor-pointer hover:underline ${chosenContent === detail.new_content_snippet ? 'text-primary font-medium' : 'text-primary'}`} onClick={() => setChosenContent(detail.new_content_snippet || '')}> Accept Incoming </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                {detail.status === LOCAL_CONFLICT_STATUSES.PENDING ? (
                  <>
                    <div className="text-xs font-medium mb-1">Edit Resolved Content / Notes:</div>
                    <Textarea value={chosenContent} onChange={(e) => setChosenContent(e.target.value)} rows={6} className="font-mono text-sm" />
                  </>
                ) : (
                  <>
                    <div className="text-xs font-medium mb-1">Final Resolution Notes:</div>
                    <pre className="bg-muted/20 p-2 rounded text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">{detail.resolution_content}</pre>
                  </>
                )}
              </div>

              <DialogFooter className="flex justify-end space-x-2 pt-0">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                {detail.status === LOCAL_CONFLICT_STATUSES.PENDING && (
                  <>
                    <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting…' : 'Reject'}
                    </Button>
                    <Button onClick={handleResolve} disabled={isSubmitting || !chosenContent.trim()}>
                      {isSubmitting ? 'Submitting…' : 'Mark as Resolved'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
          {!isDetailLoading && !detail && ( <div className="p-4 text-center text-muted-foreground">Could not load conflict details.</div> )}
        </DialogContent>
      </Dialog>
    </>
  );
}