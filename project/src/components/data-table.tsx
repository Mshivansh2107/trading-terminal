import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CSVLink } from 'react-csv';
import { Button } from './ui/button';
import { DownloadIcon } from 'lucide-react';
import { formatCurrency, formatQuantity, formatDateTime } from '../lib/utils';

interface Column {
  key: string;
  label: string;
  formatter?: (value: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  title: string;
  csvFilename?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  title,
  csvFilename = 'data-export.csv',
}) => {
  // Prepare headers for CSV export
  const csvHeaders = columns.map(column => ({
    label: column.label,
    key: column.key
  }));

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
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

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead key={column.key} className="bg-gray-50 font-medium">
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map(column => (
                    <TableCell key={`${rowIndex}-${column.key}`}>
                      {column.formatter 
                        ? column.formatter(row[column.key])
                        : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable;