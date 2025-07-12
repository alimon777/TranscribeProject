import React, { useState, useEffect, useCallback } from 'react';
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
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ListFilter,
  FilterX,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
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
import { CONFLICT_STATUSES, ANOMALY_TYPES } from '@/lib/constants';
import StatusBadge from '@/components/StatusBadge';

/**
 * Skeleton component for the initial page load.
 * This version uses a single block for the table area as requested.
 */
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
             <div>
               <Skeleton className="h-6 w-1/4 mb-2" />
               <Skeleton className="h-4 w-1/3" />
             </div>
             <div className="flex items-center gap-2 w-full md:w-auto">
                <Skeleton className="h-9 w-[150px] lg:w-[200px]" />
                <Skeleton className="h-9 w-[130px]" />
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-9 w-24" />
             </div>
          </div>
        </CardHeader>
        <CardContent>
           {/* Single skeleton block representing the entire table area */}
           <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [conflicts, setConflicts] = useState([]);
  const [apiStats, setApiStats] = useState({ pending: 0, resolved: 0, rejected: 0, total: 0 });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const { alert, confirm } = usePopup();
  const [detail, setDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chosenContent, setChosenContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for filters, search, and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeStatusFilters, setActiveStatusFilters] = useState(new Set());
  const [activeAnomalyFilters, setActiveAnomalyFilters] = useState(new Set());

  // Debounce search input to prevent excessive API calls
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400); // 400ms delay after user stops typing
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Fetch conflicts data from the API
  const fetchConflicts = useCallback(async () => {
    setIsReloading(true); // Always set reloading state for feedback on any change
    try {
      const params = {
        status_filters: activeStatusFilters.size > 0 ? Array.from(activeStatusFilters).join(',') : undefined,
        anomaly_type_filters: activeAnomalyFilters.size > 0 ? Array.from(activeAnomalyFilters).join(',') : undefined,
        search: debouncedSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      const data = await getAdminConflicts(params);
      setConflicts(data.conflicts || []);
      setApiStats(data.stats || { pending: 0, resolved: 0, rejected: 0, total: 0 });
    } catch (error) {
      console.error('Failed to fetch admin conflicts:', error);
      alert(`Failed to load conflicts: ${error.detail || error.message}`);
      setConflicts([]); // Reset on error
    } finally {
      setIsInitialLoading(false); // First load is complete
      setIsReloading(false); // Any subsequent reload is complete
    }
  }, [activeStatusFilters, activeAnomalyFilters, debouncedSearch, sortBy, sortOrder, alert]);

  // Effect to trigger the fetch when dependencies change
  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

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
      .then(setDetail)
      .catch((error) => alert(`Failed to load details: ${error.detail || error.message}`))
      .finally(() => setIsDetailLoading(false));
  };

  const handleResolve = () => { /* ... unchanged ... */ };
  const handleReject = async () => { /* ... unchanged ... */ };

  const handleFilterChange = (setter, value, checked) => {
    setter((prevFilters) => {
      const newFilters = new Set(prevFilters);
      checked ? newFilters.add(value) : newFilters.delete(value);
      return newFilters;
    });
  };
  
  const toggleSortOrder = () => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
  const totalActiveFilters = activeStatusFilters.size + activeAnomalyFilters.size;
  const formatAnomalyName = (name) => name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const clearAllFilters = () => {
    setActiveStatusFilters(new Set());
    setActiveAnomalyFilters(new Set());
  };

  if (isInitialLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <>
      <div className="p-4 md:p-6 w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage disputed content and resolve integration conflicts.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((c) => (
            <Card key={c.title}>
              <CardHeader className="flex justify-between items-center pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">{c.title}</CardTitle>
                <c.Icon className={c.color} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{c.value || 0}</div></CardContent>
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden">
          <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>
                    Disputed Content & Anomalies
                    {totalActiveFilters > 0 && (<Badge variant="secondary" className="ml-2 font-normal text-xs align-middle">{totalActiveFilters} Filter{totalActiveFilters > 1 && 's'} Active</Badge>)}
                  </CardTitle>
                  <CardDescription className="text-xs pt-1">Review, filter, and resolve integration conflicts. Click a row for details.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Input placeholder="Search conflicts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 flex-grow md:flex-grow-0 md:w-[150px] lg:w-[200px]"/>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[130px] h-9" aria-label="Sort by"><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent><SelectItem value="updated_at">Updated Date</SelectItem></SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={toggleSortOrder} className="h-9 w-9" aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}>
                    {sortOrder === 'asc' ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownNarrowWide className="h-4 w-4" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1 relative">
                        <ListFilter className="h-3.5 w-3.5" />
                        {totalActiveFilters > 0 && (<span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] items-center justify-center">{totalActiveFilters}</span></span>)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {Object.values(CONFLICT_STATUSES).map((status) => (<DropdownMenuCheckboxItem key={status} checked={activeStatusFilters.has(status)} onCheckedChange={(checked) => handleFilterChange(setActiveStatusFilters, status, Boolean(checked))}>{status}</DropdownMenuCheckboxItem>))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Filter by Anomaly Type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {Object.values(ANOMALY_TYPES).map((type) => (<DropdownMenuCheckboxItem key={type} checked={activeAnomalyFilters.has(type)} onCheckedChange={(checked) => handleFilterChange(setActiveAnomalyFilters, type, Boolean(checked))}>{formatAnomalyName(type)}</DropdownMenuCheckboxItem>))}
                      {totalActiveFilters > 0 && (<><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:bg-destructive/10" onSelect={clearAllFilters}><FilterX className="h-4 w-4 mr-2" />Clear All Filters</DropdownMenuItem></>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>New Content</TableHead>
                    <TableHead>Existing Content</TableHead>
                    <TableHead>Anomaly</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isReloading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={`skeleton-${i}`} className="border-none">
                        <TableCell colSpan={5} className="p-2"><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : conflicts.length > 0 ? (
                    conflicts.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openConflict(c.id)}>
                        <TableCell className="py-2">{c.new_transcription_title}<div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.new_content_snippet}</div></TableCell>
                        <TableCell className="py-2">{c.existing_transcription_title}<div className="text-[11px] text-muted-foreground truncate max-w-xs">{c.existing_content_snippet}</div></TableCell>
                        <TableCell className="py-2"><StatusBadge status={c.anomaly_type} /></TableCell>
                        <TableCell className="py-2">{new Date(c.updated_date).toLocaleString()}</TableCell>
                        <TableCell className="py-2"><StatusBadge status={c.status} /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <CardIllustration className='h-40 w-40 inline-block' />
                        <div className="text-muted-foreground text-sm mt-4">No conflicts found matching your criteria.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
                  {detail.status === CONFLICT_STATUSES.PENDING && (
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
                  {detail.status === CONFLICT_STATUSES.PENDING && (
                    <div className="flex justify-end mt-2">
                      <span className={`text-sm cursor-pointer hover:underline ${chosenContent === detail.new_content_snippet ? 'text-primary font-medium' : 'text-primary'}`} onClick={() => setChosenContent(detail.new_content_snippet || '')}> Accept Incoming </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                {detail.status === CONFLICT_STATUSES.PENDING ? (
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
                {detail.status === CONFLICT_STATUSES.PENDING && (
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