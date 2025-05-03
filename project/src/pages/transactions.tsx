import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  salesAtom, 
  purchasesAtom, 
  transfersAtom, 
  refreshDataAtom 
} from '../store/data';
import { filterByDateAtom, dateRangeAtom } from '../store/filters';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import DateRangeFilter from '../components/date-range-filter';
import { formatCurrency, formatQuantity } from '../lib/utils';
import { TransferEntry, SalesEntry, PurchaseEntry } from '../types';

function Transactions() {
  // Get all data and filter function
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [transfers] = useAtom(transfersAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [filterByDate] = useAtom(filterByDateAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  const [isLoading, setIsLoading] = useState(false);
  
  // Apply date filtering
  const filteredSales = filterByDate(sales);
  const filteredPurchases = filterByDate(purchases);
  const filteredTransfers = filterByDate(transfers);
  
  // State for sorting
  const [transactionType, setTransactionType] = useState<'all' | 'sales' | 'purchases' | 'transfers'>('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Combined and typed transactions
  type Transaction = (SalesEntry | PurchaseEntry | TransferEntry) & { type: string };
  
  const typedSales: Transaction[] = filteredSales.map(sale => ({
    ...sale,
    type: 'sale'
  }));
  
  const typedPurchases: Transaction[] = filteredPurchases.map(purchase => ({
    ...purchase,
    type: 'purchase'
  }));
  
  const typedTransfers: Transaction[] = filteredTransfers.map(transfer => ({
    ...transfer,
    type: 'transfer'
  }));
  
  // Combine all transactions or filter based on selected type
  let transactions: Transaction[] = [];
  
  switch (transactionType) {
    case 'sales':
      transactions = typedSales;
      break;
    case 'purchases':
      transactions = typedPurchases;
      break;
    case 'transfers':
      transactions = typedTransfers;
      break;
    default:
      transactions = [...typedSales, ...typedPurchases, ...typedTransfers];
  }
  
  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
    // Handle different date formats
    const valueA = sortField === 'createdAt' 
      ? new Date(a[sortField]).getTime() 
      : a[sortField as keyof Transaction];
    const valueB = sortField === 'createdAt' 
      ? new Date(b[sortField]).getTime() 
      : b[sortField as keyof Transaction];
    
    // Compare values based on sort order
    if (sortOrder === 'asc') {
      // Add null checks with defaults
      return (valueA ?? 0) > (valueB ?? 0) ? 1 : -1;
    } else {
      return (valueA ?? 0) < (valueB ?? 0) ? 1 : -1;
    }
  });
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Change sort when header is clicked
  const handleSort = (field: string) => {
    if (field === sortField) {
      // If already sorting by this field, toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If new field, default to descending
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  // Load data on first render
  useEffect(() => {
    handleRefresh();
  }, []);
  
  // Function to display the amount/quantity/price for a transaction based on its type
  const renderAmount = (transaction: Transaction) => {
    if (transaction.type === 'sale' || transaction.type === 'purchase') {
      const t = transaction as (SalesEntry | PurchaseEntry);
      return formatCurrency(t.totalPrice);
    } else if (transaction.type === 'transfer') {
      const t = transaction as TransferEntry;
      return formatQuantity(t.quantity);
    }
    return '-';
  };
  
  // Function to display the appropriate entity (platform/bank) for a transaction
  const renderEntity = (transaction: Transaction) => {
    if (transaction.type === 'sale' || transaction.type === 'purchase') {
      const t = transaction as (SalesEntry | PurchaseEntry);
      return `Platform: ${t.platform}, Bank: ${t.bank}`;
    } else if (transaction.type === 'transfer') {
      const t = transaction as TransferEntry;
      return `From: ${t.from} → To: ${t.to}`;
    }
    return '-';
  };
  
  return (
    <div className="flex flex-col h-full p-4 md:p-6 bg-gray-50 min-h-screen w-full">
      {/* Fixed header area */}
      <div className="flex flex-col space-y-4 w-full mb-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-gray-500">View and manage all transactions</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter />
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
        
        {/* Filter options */}
        <div className="mb-2">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={transactionType === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTransactionType('all')}
            >
              All
            </Button>
            <Button 
              variant={transactionType === 'sales' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTransactionType('sales')}
            >
              Sales
            </Button>
            <Button 
              variant={transactionType === 'purchases' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTransactionType('purchases')}
            >
              Purchases
            </Button>
            <Button 
              variant={transactionType === 'transfers' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setTransactionType('transfers')}
            >
              Transfers
            </Button>
          </div>
        </div>
      </div>
      
      {/* Transactions table with contained scrolling */}
      <div className="w-full" style={{ overflowX: 'hidden' }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>
                Transactions
                {dateRange.isActive && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (Filtered by date range)
                  </span>
                )}
              </span>
              <span className="text-sm font-normal text-gray-500">
                {sortedTransactions.length} results
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap" 
                      onClick={() => handleSort('type')}
                      style={{ minWidth: '100px' }}
                    >
                      Type
                      {sortField === 'type' && (
                        <ArrowUpDown className="inline ml-1 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead style={{ minWidth: '250px' }} className="whitespace-nowrap">Entity</TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap" 
                      onClick={() => handleSort('createdAt')}
                      style={{ minWidth: '150px' }}
                    >
                      Date
                      {sortField === 'createdAt' && (
                        <ArrowUpDown className="inline ml-1 h-4 w-4" />
                      )}
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap" style={{ minWidth: '120px' }}>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.length > 0 ? (
                    sortedTransactions.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell className="capitalize whitespace-nowrap">
                          {transaction.type}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {renderEntity(transaction)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {renderAmount(transaction)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-gray-500">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Transactions; 