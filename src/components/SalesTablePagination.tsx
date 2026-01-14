import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface SalesTablePaginationProps {
  pagination: PaginationState;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSetPage: (page: number) => void;
  onSetPageSize: (size: number) => void;
  loading?: boolean;
}

const SalesTablePagination = ({
  pagination,
  onNextPage,
  onPrevPage,
  onSetPage,
  onSetPageSize,
  loading = false,
}: SalesTablePaginationProps) => {
  const { page, pageSize, totalCount, totalPages } = pagination;
  
  // Calculate range display
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push('ellipsis');
      }
      
      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      {/* Left side: Results info */}
      <div className="text-sm text-muted-foreground">
        Mostrando{" "}
        <span className="font-medium text-foreground">{startItem}</span>
        {" – "}
        <span className="font-medium text-foreground">{endItem}</span>
        {" de "}
        <span className="font-medium text-foreground">{totalCount.toLocaleString('pt-BR')}</span>
        {" resultados"}
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSetPage(1)}
          disabled={page === 1 || loading}
          title="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onPrevPage}
          disabled={page === 1 || loading}
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((pageNum, idx) => (
            pageNum === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onSetPage(pageNum)}
                disabled={loading}
              >
                {pageNum}
              </Button>
            )
          ))}
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onNextPage}
          disabled={page >= totalPages || loading}
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSetPage(totalPages)}
          disabled={page >= totalPages || loading}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right side: Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Por página:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onSetPageSize(Number(value))}
          disabled={loading}
        >
          <SelectTrigger className="w-[80px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
            <SelectItem value="500">500</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SalesTablePagination;
