import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  ListFilter,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
  Ellipsis,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  getMockRepositoryData,
  getFolderTreeData,
  TRANSCRIPTION_STATUSES,
} from '../mockData'
import { useFolderOperations } from '../lib/useFolderOperations'
import { getAllDescendantFolderIds } from '../lib/utils'
import { TreeView } from '../components/ui/tree-view'
import TranscriptionPreview from '../components/TranscriptionPreview'
import TranscriptionExpandedPreview from '../components/TranscriptionExpandedPreview'
import IntegrationFolderDialog from '../components/IntegrationFolderDialog'
import StatusBadge from '../components/StatusBadge'
import { usePopup } from '../components/PopupProvider'
import { Skeleton } from '@/components/ui/skeleton'

export default function RepositoryPage() {
  const navigate = useNavigate()
  const [treeData, setTreeData] = useState([])
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [transcriptions, setTranscriptions] = useState([])
  const [search, setSearch] = useState('')
  const [selectedTranscription, setSelectedTranscription] = useState(null)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [sortField, setSortField] = useState('processed_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [activeStatusFilters, setActiveStatusFilters] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const { confirm, alert } = usePopup()
  const { handleAdd, handleRename, handleDelete } = useFolderOperations(
    treeData,
    setTreeData,
    selectedFolder,
    setSelectedFolder
  )

  const reload = useCallback(async () => {
    const repo = await getMockRepositoryData()
    setTranscriptions(repo.transcriptions)
    setTreeData(getFolderTreeData())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const toggleSortOrder = () => {
    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
  }
  const handleStatusFilterChange = (status, checked) => {
    setActiveStatusFilters((f) => {
      const nf = new Set(f)
      checked ? nf.add(status) : nf.delete(status)
      return nf
    })
  }

  const list = useMemo(() => {
    let folderIds = null
    if (selectedFolder !== 'all' && treeData.length) {
      folderIds = getAllDescendantFolderIds(treeData, selectedFolder)
    }
    return transcriptions
      .filter((t) =>
        !folderIds ? true : folderIds.includes(t.folder_id)
      )
      .filter((t) =>
        !search
          ? true
          : t.session_title
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            t.topics?.some((tp) =>
              tp.toLowerCase().includes(search.toLowerCase())
            ) ||
            t.cleaned_transcript_text
              .toLowerCase()
              .includes(search.toLowerCase())
      )
      .filter((t) =>
        activeStatusFilters.size
          ? activeStatusFilters.has(t.status)
          : true
      )
      .sort((a, b) => {
        let va = a[sortField]
        let vb = b[sortField]
        if (sortField.includes('at')) {
          va = new Date(va || 0).getTime()
          vb = new Date(vb || 0).getTime()
        }
        if (va < vb) return sortOrder === 'asc' ? -1 : 1
        if (va > vb) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
  }, [
    transcriptions,
    selectedFolder,
    treeData,
    search,
    sortField,
    sortOrder,
    activeStatusFilters,
  ])

  const getFolderName = (id) => {
    if (id === 'all') return 'All Transcriptions'
    const find = (nodes) => {
      for (const n of nodes) {
        if (n.id === id) return n.name
        if (n.children) {
          const c = find(n.children)
          if (c) return c
        }
      }
    }
    return find(treeData) || 'Unknown'
  }

  const handleMoveTranscription = (folderId, pathArray) => {
    if (!selectedTranscription) return
    setTranscriptions((p) =>
      p.map((t) =>
        t.id === selectedTranscription.id
          ? { ...t, folder_id: folderId }
          : t
      )
    )
    alert(
      `Moved "${selectedTranscription.session_title}" to ${pathArray.join(
        ' / '
      )}`
    )
    setSelectedTranscription(null)
    setMoveModalOpen(false)
  }

  const handleDeleteTranscription = async () => {
    if (!selectedTranscription) return
    const ok = await confirm(
      `Delete "${selectedTranscription.session_title}"?`
    )
    if (ok) {
      setTranscriptions((p) =>
        p.filter((t) => t.id !== selectedTranscription.id)
      )
      alert(`Deleted "${selectedTranscription.session_title}".`)
      setSelectedTranscription(null)
    }
  }

  const handleDownloadTranscription = () => {
    if (!selectedTranscription) return
    const content = `Title: ${selectedTranscription.session_title}\n\n${selectedTranscription.cleaned_transcript_text}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTranscription.session_title
      .replace(/\W/g, '_')
      .toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const statusFilterOptions = [
    TRANSCRIPTION_STATUSES.INTEGRATED,
    TRANSCRIPTION_STATUSES.DRAFT,
    TRANSCRIPTION_STATUSES.ARCHIVED,
  ]

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-1">
          Transcription Repository
        </h1>
        <p className="text-muted-foreground">
          Browse, organize, and search all stored transcriptions.
        </p>
      </div>

      {/* main flex container: stacks on mobile, row on md+ */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* sidebar */}
        <aside className="w-full md:w-64 border rounded p-2 flex-shrink-0"> {/* Added flex-shrink-0 for robustness */}
          <h2 className="font-medium py-2 ml-3 mb-2">Directory</h2>
          <TreeView
            data={treeData}
            initialSelectedId={selectedFolder}
            onNodeSelect={(id) => {
              setSelectedFolder(id)
              setSelectedTranscription(null)
            }}
            onNodeAddCommit={handleAdd}
            onNodeEditCommit={handleRename}
            onNodeDeleteCommit={handleDelete}
            enableEditing
            allowRootFolderAdd
          />
        </aside>

        {/* main section */}
        {/* Added min-w-0 here to allow this flex item to shrink */}
        <section className="flex-1 space-y-4 min-w-0">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by title, topic or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-grow"
            />
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session_title">Title</SelectItem>
                <SelectItem value="processed_at">
                  Date Processed
                </SelectItem>
                <SelectItem value="uploaded_at">
                  Date Uploaded
                </SelectItem>
                <SelectItem value="session_purpose">
                  Purpose
                </SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
            >
              {sortOrder === 'asc' ? (
                <ArrowUpNarrowWide />
              ) : (
                <ArrowDownNarrowWide />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                >
                  <ListFilter />
                  {activeStatusFilters.size > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] items-center justify-center">
                        {activeStatusFilters.size}
                      </span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusFilterOptions.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={activeStatusFilters.has(status)}
                    onCheckedChange={(checked) =>
                      handleStatusFilterChange(status, checked)
                    }
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
                {activeStatusFilters.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={(e) => {
                        e.preventDefault()
                        setActiveStatusFilters(new Set())
                      }}
                    >
                      Clear Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* list + preview: stack on mobile, row on md+ */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* list pane */}
            {/* Added md:min-w-0 here to allow this flex item to shrink on md+ screens */}
            <div
              className={`w-full md:flex-1 md:min-w-0 transition-all duration-300`}
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    In "{getFolderName(selectedFolder)}"
                    {activeStatusFilters.size > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-2 font-normal text-xs"
                      >
                        {activeStatusFilters.size} Status Filter
                        {activeStatusFilters.size > 1 ? 's' : ''}{' '}
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {list.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground">
                      No items found.
                    </p>
                  ) : (
                    <div className="max-h-[345px] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card">
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead>Topics</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.map((t) => (
                            <TableRow
                              key={t.id}
                              className={`cursor-pointer hover:bg-muted ${
                                selectedTranscription?.id === t.id
                                  ? 'bg-muted'
                                  : ''
                              }`}
                              onClick={() => setSelectedTranscription(t)}
                            >
                              <TableCell>
                                <div className="font-medium truncate max-w-xs">
                                  {t.session_title}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                  {t.source_file_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(
                                  t.processed_at
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="truncate max-w-[150px]">
                                {t.session_purpose}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {t.topics
                                    ?.slice(0, 2)
                                    .map((tp) => (
                                      <Badge
                                        key={tp}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {tp}
                                      </Badge>
                                    ))}
                                  {t.topics?.length > 2 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +{t.topics.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={t.status} />
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon_xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTranscription(t)
                                  }}
                                >
                                  <Ellipsis />
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

            {/* preview pane */}
            {selectedTranscription && (
              // Added flex-shrink-0 for robustness, ensuring it tries to maintain its width
              <div className="w-full md:w-1/3 flex-shrink-0"> 
                <TranscriptionPreview
                  transcription={selectedTranscription}
                  folderName={getFolderName(
                    selectedTranscription.folder_id
                  )}
                  onClose={() => setSelectedTranscription(null)}
                  onExpand={() => setIsPreviewExpanded(true)}
                  onDelete={handleDeleteTranscription}
                  onMove={() => setMoveModalOpen(true)}
                  onDownload={handleDownloadTranscription}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedTranscription && (
        <TranscriptionExpandedPreview
          transcription={selectedTranscription}
          folderName={getFolderName(selectedTranscription.folder_id)}
          isOpen={isPreviewExpanded}
          onClose={() => setIsPreviewExpanded(false)}
        />
      )}

      {moveModalOpen && selectedTranscription && (
        <IntegrationFolderDialog
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          onConfirm={handleMoveTranscription}
        />
      )}
    </div>
  )
}