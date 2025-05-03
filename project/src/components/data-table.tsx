import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CSVLink } from 'react-csv';
import { Button } from './ui/button';
import { DownloadIcon, PencilIcon } from 'lucide-react';
import { formatCurrency, formatQuantity, formatDateTime } from '../lib/utils';

interface Column {
  key: string;
  label: string;
  formatter?: (value: any, row?: any) => React.ReactNode;
  width?: string;
}

interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (rowData: any) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  title: string;
  csvFilename?: string;
  rowActions?: RowAction[];
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  title,
  csvFilename = 'data-export.csv',
  rowActions = []
}) => {
  // Prepare headers for CSV export
  const csvHeaders = columns.map(column => ({
    label: column.label,
    key: column.key
  }));

  const hasActions = rowActions.length > 0;

  // Find the index of "createdAt" column to insert actions after it
  const createdAtIndex = columns.findIndex(col => col.key === 'createdAt');
  const actionColumnPosition = createdAtIndex !== -1 ? createdAtIndex + 1 : columns.length;

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
        {data.length > 0 && (
          <CSVLink 
            data={data} 
            headers={csvHeaders}
            filename={csvFilename}
            className="no-underline"
          >
            <Button variant="outline" size="sm" className="flex items-center">
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CSVLink>
        )}
      </div>

      {/* Table container with fixed width and horizontal scroll only for the table */}
      <div className="relative w-full border rounded-md" style={{ maxWidth: '100%' }}>
        <div className="overflow-x-auto" style={{ maxHeight: '70vh' }}>
          <div style={{ minWidth: '100%', width: 'max-content' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  {columns.slice(0, actionColumnPosition).map(column => (
                    <TableHead 
                      key={column.key} 
                      className="bg-gray-50 font-medium text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4"
                      style={{ minWidth: getColumnMinWidth(column.key) }}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                  {hasActions && (
                    <TableHead className="bg-gray-50 font-medium text-right px-2 sm:px-4 whitespace-nowrap" style={{ width: '100px' }}>
                      Actions
                    </TableHead>
                  )}
                  {columns.slice(actionColumnPosition).map(column => (
                    <TableHead 
                      key={column.key} 
                      className="bg-gray-50 font-medium text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4"
                      style={{ minWidth: getColumnMinWidth(column.key) }}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length > 0 ? (
                  data.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="hover:bg-gray-50">
                      {columns.slice(0, actionColumnPosition).map(column => (
                        <TableCell 
                          key={`${rowIndex}-${column.key}`}
                          className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap"
                        >
                          {column.formatter 
                            ? column.formatter(row[column.key], row)
                            : row[column.key]}
                        </TableCell>
                      ))}
                      {hasActions && (
                        <TableCell className="px-2 sm:px-4 whitespace-nowrap">
                          <div className="flex justify-end space-x-1">
                            {rowActions.map((action, actionIndex) => (
                              <Button
                                key={actionIndex}
                                size="sm"
                                variant={action.variant || 'ghost'}
                                onClick={() => action.onClick(row)}
                                className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                                title={action.label}
                              >
                                {action.icon}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      )}
                      {columns.slice(actionColumnPosition).map(column => (
                        <TableCell 
                          key={`${rowIndex}-${column.key}`}
                          className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap"
                        >
                          {column.formatter 
                            ? column.formatter(row[column.key], row)
                            : row[column.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + (hasActions ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to determine appropriate minimum width for each column type
function getColumnMinWidth(columnKey: string): string {
  switch (columnKey) {
    case 'orderNumber':
      return '130px';
    case 'bank':
    case 'platform':
      return '150px';
    case 'totalPrice':
    case 'price':
    case 'quantity':
      return '120px';
    case 'name':
      return '180px';
    case 'createdAt':
      return '180px';
    case 'createdBy':
      return '150px';
    case 'editedBy':
      return '150px';
    case 'updatedAt':
      return '180px';
    default:
      return '120px';
  }
}

export default DataTable;