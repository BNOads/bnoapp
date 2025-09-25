import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart3, Table, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ColumnConfig {
  key: string;
  label: string;
  type: 'currency' | 'number' | 'percentage' | 'text';
  sortable?: boolean;
}

interface DebriefingChartWithTableProps {
  chartId: string;
  title: string;
  data: any[];
  columns: ColumnConfig[];
  children: React.ReactNode; // Chart component
  onExport?: (format: 'csv' | 'excel') => void;
}

type SortDirection = 'asc' | 'desc' | null;

export const DebriefingChartWithTable: React.FC<DebriefingChartWithTableProps> = ({
  chartId,
  title,
  data,
  columns,
  children,
  onExport
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Load user preference
  useEffect(() => {
    const preferences = localStorage.getItem('debriefing_chart_preferences');
    if (preferences) {
      try {
        const parsed = JSON.parse(preferences);
        if (parsed[chartId]) {
          setViewMode(parsed[chartId]);
        }
      } catch (error) {
        console.error('Error loading chart preferences:', error);
      }
    }
  }, [chartId]);

  // Save user preference
  const saveViewMode = (mode: 'chart' | 'table') => {
    setViewMode(mode);
    
    try {
      const preferences = localStorage.getItem('debriefing_chart_preferences');
      const parsed = preferences ? JSON.parse(preferences) : {};
      parsed[chartId] = mode;
      localStorage.setItem('debriefing_chart_preferences', JSON.stringify(parsed));
    } catch (error) {
      console.error('Error saving chart preferences:', error);
    }
  };

  const formatValue = (value: any, type: ColumnConfig['type']) => {
    if (value === null || value === undefined || value === '') return '-';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2
        }).format(Number(value));
      
      case 'number':
        return new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1
        }).format(Number(value));
      
      case 'percentage':
        return new Intl.NumberFormat('pt-BR', {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(Number(value) / 100);
      
      default:
        return String(value);
    }
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortedData = () => {
    let filteredData = data;

    // Apply search filter
    if (searchTerm) {
      filteredData = data.filter(item =>
        columns.some(col => {
          const value = item[col.key];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filteredData = [...filteredData].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // For numbers, compare numerically
        if (typeof aValue === 'number' || !isNaN(Number(aValue))) {
          const numA = Number(aValue);
          const numB = Number(bValue);
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
        
        // For strings, compare alphabetically
        const strA = String(aValue).toLowerCase();
        const strB = String(bValue).toLowerCase();
        if (sortDirection === 'asc') {
          return strA.localeCompare(strB);
        } else {
          return strB.localeCompare(strA);
        }
      });
    }

    return filteredData;
  };

  const sortedData = getSortedData();
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const exportToCSV = () => {
    const headers = columns.map(col => col.label).join(',');
    const rows = sortedData.map(item => 
      columns.map(col => {
        const value = item[col.key];
        // Escape quotes and wrap in quotes if contains comma
        const formattedValue = formatValue(value, col.type);
        return formattedValue.includes(',') ? `"${formattedValue.replace(/"/g, '""')}"` : formattedValue;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {viewMode === 'table' && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            )}
            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => saveViewMode('chart')}
                className="flex items-center gap-2"
                title="Ver como gráfico"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => saveViewMode('table')}
                className="flex items-center gap-2"
                title="Ver como tabela"
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'chart' ? (
          children
        ) : (
          <div className="space-y-4">
            {/* Search */}
            {data.length > 10 && (
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="max-w-sm"
                />
                <span className="text-sm text-muted-foreground">
                  {sortedData.length} de {data.length} itens
                </span>
              </div>
            )}

            {/* Table */}
            <div className="rounded-md border">
              <TableComponent>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={`${column.sortable !== false ? 'cursor-pointer hover:bg-muted/50' : ''} ${
                          column.type === 'number' || column.type === 'currency' || column.type === 'percentage' 
                            ? 'text-right' : 'text-left'
                        }`}
                        onClick={() => column.sortable !== false && handleSort(column.key)}
                      >
                        <div className="flex items-center justify-between">
                          {column.label}
                          {column.sortable !== false && getSortIcon(column.key)}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item, index) => (
                    <TableRow key={index}>
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={
                            column.type === 'number' || column.type === 'currency' || column.type === 'percentage'
                              ? 'text-right'
                              : 'text-left'
                          }
                        >
                          {formatValue(item[column.key], column.type)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </TableComponent>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};