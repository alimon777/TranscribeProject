import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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
  ListFilter,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
  Ellipsis,
  FilterX,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  getRepositoryData,
  deleteTranscription,
  getFolderTree,
  relocateTranscription,
} from '../services/apiClient';
import { useFolderOperations } from '../lib/useFolderOperations';
import { TreeView } from '../components/ui/tree-view';
import TranscriptionPreview from '../components/TranscriptionPreview';
import CardIllustration from '@/svg_components/CardsIllustration';
import IntegrationFolderDialog from '../components/IntegrationFolderDialog';
import { usePopup } from '../components/PopupProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { ContextData } from '@/lib/ContextData';
import { SESSION_PURPOSES } from '@/lib/constants';

// Session Purpose Enum Values

export default function RepositoryPage() {
  const navigate = useNavigate();
  const { treeData, updateFolderTree } = useContext(ContextData);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [transcriptions, setTranscriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTranscription, setSelectedTranscription] = useState(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [sortField, setSortField] = useState('integrated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activePurposeFilters, setActivePurposeFilters] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { confirm, alert } = usePopup();

  const {
    handleAdd: handleAddFolder,
    handleRename: handleRenameFolder,
    handleDelete: handleDeleteFolder,
  } = useFolderOperations(selectedFolder, setSelectedFolder);

  // ... useEffect for fetching tree remains the same ...
  useEffect(() => {
    const fetchInitialTree = async () => {
      try {
        const fetchedTree = await getFolderTree();
        updateFolderTree(fetchedTree);
      } catch (error) {
        console.error("Failed to fetch folder tree:", error);
        alert(`Failed to load folder tree: ${error.detail || error.message || 'Please try again.'}`);
        updateFolderTree([]);
      }
    };
    fetchInitialTree();
  }, []); 

  // ... fetchRepositoryContent and other handlers remain the same ...
  const fetchRepositoryContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        folder_id: selectedFolder === 'all' ? null : selectedFolder,
        search: search || undefined,
        sort_by: sortField,
        sort_order: sortOrder,
        purpose_filters: activePurposeFilters.size > 0 ? Array.from(activePurposeFilters).join(',') : undefined,
      };
      const repoData = await getRepositoryData(params);
      setTranscriptions(repoData);
    } catch (error) {
      console.error("Failed to fetch repository transcriptions:", error);
      alert(`Failed to load repository transcriptions: ${error.detail || error.message || 'Please try again.'}`);
      setTranscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, search, sortField, sortOrder, activePurposeFilters]);

  useEffect(() => {
    fetchRepositoryContent();
  }, [fetchRepositoryContent]);

  const toggleSortOrder = () => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));

  const handlePurposeFilterChange = (purpose, checked) => {
    setActivePurposeFilters((prevFilters) => {
      const newFilters = new Set(prevFilters);
      if (checked) newFilters.add(purpose);
      else newFilters.delete(purpose);
      return newFilters;
    });
  };

  const getFolderName = useCallback((folderId) => {
    if (!folderId || folderId === 'all') return 'All Transcriptions';
    const findNode = (nodes, id) => {
      for (const node of nodes) {
        if (node.id === id) return node.name;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(treeData, folderId) || 'Unknown Folder';
  }, [treeData]);

  const handleMoveTranscription = async (targetFolderId, pathArray) => {
    if (!selectedTranscription) return;
    setIsLoading(true);
    try {
      await relocateTranscription(selectedTranscription.id, targetFolderId);
      alert(`Moved "${selectedTranscription.title}" to ${pathArray.join(' / ')}`);
      setSelectedTranscription(null);
      setMoveModalOpen(false);
      fetchRepositoryContent();
    } catch (error) {
      console.error("Failed to move transcription:", error);
      alert(`Error moving transcription: ${error.detail || error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTranscription = async () => {
    if (!selectedTranscription) return;
    const ok = await confirm(`Are you sure you want to delete "${selectedTranscription.title}"? This item is already integrated.`);
    if (ok) {
      setIsLoading(true);
      try {
        await deleteTranscription(selectedTranscription.id);
        alert(`Deleted "${selectedTranscription.title}".`);
        setSelectedTranscription(null);
        fetchRepositoryContent();
      } catch (error) {
        console.error("Failed to delete transcription:", error);
        alert(`Error deleting transcription: ${error.detail || error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDownloadTranscription = () => {
    if (!selectedTranscription) return;
    const content = `Title: ${selectedTranscription.title}\nPurpose: ${selectedTranscription.purpose || 'N/A'}\nIntegrated: ${new Date(selectedTranscription.updated_date).toLocaleString()}\n\n${selectedTranscription.transcript || 'No content available.'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedTranscription.title || 'transcription').replace(/\W/g, '_').toLowerCase()}_integrated.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ... Skeleton and main component structure remains the same ...
  if (isLoading && transcriptions.length === 0 && treeData.length === 0) {
    return (
      <div className="p-4 md:p-6 w-full">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64 border rounded p-2 flex-shrink-0">
            <Skeleton className="h-8 w-1/2 ml-3 mb-4" />
            <Skeleton className="h-40 w-full" />
          </aside>
          <section className="flex-1 space-y-4 min-w-0">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-1">Integrated Knowledge Repository</h1>
        <p className="text-muted-foreground">Browse, organize, and search all integrated transcriptions.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 border rounded p-2 flex-shrink-0">
          <h2 className="font-medium py-2 ml-3 mb-2">Directory</h2>
          {treeData.length === 0 && isLoading ? (
            <Skeleton className="h-40 w-full p-2" />
          ) : (
            <TreeView
              data={treeData}
              initialSelectedId={selectedFolder}
              onNodeSelect={(id) => {
                setSelectedFolder(id);
                setSelectedTranscription(null);
              }}
              onNodeAddCommit={async (parentId, name) => {
                const result = await handleAddFolder(parentId, name);
                if (result.success) fetchRepositoryContent();
              }}
              onNodeEditCommit={async (id, newName, oldName) => {
                const success = await handleRenameFolder(id, newName, oldName);
                if (success) fetchRepositoryContent();
              }}
              onNodeDeleteCommit={async (id, name) => {
                const success = await handleDeleteFolder(id, name);
                if (success) {
                  if (selectedFolder === id) setSelectedFolder('all');
                  fetchRepositoryContent();
                }
              }}
              enableEditing
              allowRootFolderAdd
            />
          )}
        </aside>

        <section className="flex-1 space-y-4 min-w-0">
          <div className="flex gap-2 items-center">
            <Input placeholder="Search integrated content..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-grow" />
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="session_title">Title</SelectItem>
                <SelectItem value="integrated_at">Integrated Date</SelectItem>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="uploaded_at">Uploaded Date</SelectItem>
                <SelectItem value="session_purpose">Purpose</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={toggleSortOrder} aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}>
              {sortOrder === 'asc' ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownNarrowWide className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="relative" aria-label="Filter by purpose">
                  <ListFilter className="h-4 w-4" />
                  {activePurposeFilters.size > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] items-center justify-center">{activePurposeFilters.size}</span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Filter by Session Purpose</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SESSION_PURPOSES.map((purpose) => (
                  <DropdownMenuCheckboxItem key={purpose} checked={activePurposeFilters.has(purpose)} onCheckedChange={(checked) => handlePurposeFilterChange(purpose, Boolean(checked))}>
                    {purpose}
                  </DropdownMenuCheckboxItem>
                ))}
                {activePurposeFilters.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setActivePurposeFilters(new Set()); }}>
                      <FilterX className="h-4 w-4 mr-2" />
                      Clear Purpose Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:flex-1 md:min-w-0 transition-all duration-300">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">
                    {selectedFolder === 'all' ? 'All Integrated Transcriptions' : `In "${getFolderName(selectedFolder)}"`}
                    {activePurposeFilters.size > 0 && <Badge variant="secondary" className="ml-2 font-normal text-xs align-middle">{activePurposeFilters.size} Purpose Filter{activePurposeFilters.size > 1 ? 's' : ''} Active</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading && transcriptions.length === 0 ? (
                    <div className="max-h-[345px] overflow-auto p-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full mb-2" />)}
                    </div>
                  ) : transcriptions.length === 0 ? (
                    <div className='flex-row justify-items-center'>
                      <CardIllustration className='h-50 w-50'/>
                      <div className="text-muted-foreground -mt-12 text-sm">No integrated transcriptions found matching your criteria.</div>
                    </div>
                  ) : (
                    <div className="h-[calc(100vh-345px)] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead className="hidden sm:table-cell">Integrated On</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead className="hidden md:table-cell">Topics</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transcriptions.map((t) => (
                            <TableRow key={t.id} className={`cursor-pointer hover:bg-muted ${selectedTranscription?.id === t.id ? 'bg-muted' : ''}`} onClick={() => setSelectedTranscription(t)} aria-selected={selectedTranscription?.id === t.id}>
                              <TableCell>
                                <div className="font-medium truncate max-w-[150px] sm:max-w-xs" title={t.title}>{t.title}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-xs" title={t.source_file_name}>{t.source_file_name || 'N/A'}</div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{t.updated_date ? new Date(t.updated_date).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell className="truncate max-w-[150px]" title={t.purpose}>{t.purpose || 'N/A'}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                  {t.key_topics?.slice(0, 2).map((tp) => <Badge key={tp} variant="outline" className="text-xs">{tp}</Badge>)}
                                  {t.key_topics?.length > 2 && <Badge variant="outline" className="text-xs">+{t.key_topics.length - 2}</Badge>}
                                  {(t.key_topics || []).length === 0 && <span className="text-xs text-muted-foreground">N/A</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedTranscription(t); }} aria-label={`Actions for ${t.title}`}>
                                  <Ellipsis className="h-4 w-4" />
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
            </div>

            {selectedTranscription && (
              <div className="w-full md:w-1/3 flex-shrink-0 mr-6">
                <TranscriptionPreview
                  transcription={selectedTranscription}
                  folderName={getFolderName(selectedTranscription.folder_id)}
                  onClose={() => setSelectedTranscription(null)}
                  onExpand={() => navigate(`/transcription/${selectedTranscription.id}`)}
                  onDelete={handleDeleteTranscription}
                  onMove={() => setMoveModalOpen(true)}
                  onDownload={handleDownloadTranscription}
                  isIntegratedView={true}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODIFIED: TranscriptionExpandedPreview component is removed from the JSX */}

      {moveModalOpen && selectedTranscription && (
        <IntegrationFolderDialog
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          onConfirm={handleMoveTranscription}
          currentFolderId={selectedTranscription.folder_id}
          treeData={treeData}
        />
      )}
    </div>
  );
}