import React, { useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { 
  salesAtom, 
  purchasesAtom, 
  bankTransfersAtom, 
  expensesAtom,
  banksAtom,
  beneficiariesAtom
} from '../store/data';
import { formatCurrency, formatDateTime } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CustomSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Search, Filter, Download } from 'lucide-react';
import { LedgerEntry } from '../types';
import DateRangeFilter from '../components/date-range-filter';
import { filterByDateAtom } from '../store/filters';
import { CSVLink } from 'react-csv';

const Ledger = () => {
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [bankTransfers] = useAtom(bankTransfersAtom);
  const [expenses] = useAtom(expensesAtom);
  const [banks] = useAtom(banksAtom);
  const [beneficiaries] = useAtom(beneficiariesAtom);
  const [filterByDate] = useAtom(filterByDateAtom);

  // Filter states
  const [bankFilter, setBankFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Combine all transactions into ledger entries
  const allLedgerEntries = useMemo(() => {
    const entries: LedgerEntry[] = [];

    // Add sales
    sales.forEach(sale => {
      const beneficiary = beneficiaries.find(b => b.id === sale.beneficiaryId);
      entries.push({
        id: sale.id,
        type: 'sale',
        amount: sale.totalPrice,
        bank: sale.bank,
        platform: sale.platform,
        beneficiaryName: beneficiary?.name || sale.name,
        description: `Sale - ${sale.assetType} (${sale.orderNumber})`,
        createdAt: sale.createdAt,
        createdBy: sale.createdBy,
      });
    });

    // Add purchases
    purchases.forEach(purchase => {
      const beneficiary = beneficiaries.find(b => b.id === purchase.beneficiaryId);
      entries.push({
        id: purchase.id,
        type: 'purchase',
        amount: purchase.totalPrice,
        bank: purchase.bank,
        platform: purchase.platform,
        beneficiaryName: beneficiary?.name || purchase.name,
        description: `Purchase - ${purchase.assetType} (${purchase.orderNumber})`,
        createdAt: purchase.createdAt,
        createdBy: purchase.createdBy,
      });
    });

    // Add bank transfers
    bankTransfers.forEach(transfer => {
      entries.push({
        id: transfer.id,
        type: 'bank_transfer',
        amount: transfer.amount,
        bank: transfer.fromBank,
        beneficiaryName: undefined,
        description: `Bank Transfer: ${transfer.fromBank} → ${transfer.toBank}${transfer.reference ? ` (${transfer.reference})` : ''}`,
        createdAt: transfer.createdAt,
        createdBy: transfer.createdBy || 'System',
      });
    });

    // Add expenses and income
    expenses.forEach(expense => {
      entries.push({
        id: expense.id,
        type: expense.type === 'expense' ? 'expense' : 'income',
        amount: expense.amount,
        bank: expense.bank,
        beneficiaryName: undefined,
        description: `${expense.type === 'expense' ? 'Expense' : 'Income'} - ${expense.category || 'General'}${expense.description ? `: ${expense.description}` : ''}`,
        createdAt: expense.createdAt,
        createdBy: expense.createdBy,
      });
    });

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, purchases, bankTransfers, expenses, beneficiaries]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    let filtered = filterByDate(allLedgerEntries);

    // Bank filter
    if (bankFilter) {
      filtered = filtered.filter(entry => entry.bank === bankFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(entry => entry.type === typeFilter);
    }

    // Name filter
    if (nameFilter) {
      filtered = filtered.filter(entry => 
        entry.beneficiaryName?.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.description.toLowerCase().includes(term) ||
        entry.beneficiaryName?.toLowerCase().includes(term) ||
        entry.createdBy.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [allLedgerEntries, filterByDate, bankFilter, typeFilter, nameFilter, searchTerm]);

  const columns = useMemo(() => [
    { 
      key: 'type', 
      label: 'Type',
      formatter: (value: string) => {
        const colors = {
          sale: 'bg-green-100 text-green-800',
          purchase: 'bg-blue-100 text-blue-800',
          bank_transfer: 'bg-purple-100 text-purple-800',
          expense: 'bg-red-100 text-red-800',
          income: 'bg-emerald-100 text-emerald-800',
        };
        return (
          <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors]}`}>
            {value.replace('_', ' ')}
          </span>
        );
      }
    },
    { 
      key: 'amount', 
      label: 'Amount',
      formatter: (value: number, row: LedgerEntry) => (
        <span className={row.type === 'sale' || row.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {formatCurrency(value)}
        </span>
      )
    },
    { key: 'bank', label: 'Bank' },
    { key: 'platform', label: 'Platform' },
    { key: 'beneficiaryName', label: 'Beneficiary/Name' },
    { key: 'description', label: 'Description' },
    { 
      key: 'createdAt', 
      label: 'Date',
      formatter: (value: Date) => formatDateTime(new Date(value))
    },
    { key: 'createdBy', label: 'Created By' },
  ], []);

  // Prepare CSV data
  const csvData = filteredEntries.map(entry => ({
    Type: entry.type.replace('_', ' '),
    Amount: entry.amount,
    Bank: entry.bank || '',
    Platform: entry.platform || '',
    'Beneficiary/Name': entry.beneficiaryName || '',
    Description: entry.description,
    Date: formatDateTime(new Date(entry.createdAt)),
    'Created By': entry.createdBy,
  }));

  const clearFilters = () => {
    setBankFilter('');
    setTypeFilter('');
    setNameFilter('');
    setSearchTerm('');
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ledger</h1>
          <p className="text-gray-500">Complete transaction history across all modules</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter />
          <CSVLink 
            data={csvData} 
            filename="complete-ledger.csv"
            className="no-underline"
          >
            <Button variant="outline" size="sm" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CSVLink>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bankFilter">Bank</Label>
              <CustomSelect value={bankFilter} onValueChange={setBankFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Banks</SelectItem>
                  {banks.filter(bank => bank.isActive).map((bank) => (
                    <SelectItem key={bank.id} value={bank.name}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </CustomSelect>
            </div>

            <div>
              <Label htmlFor="typeFilter">Transaction Type</Label>
              <CustomSelect value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </CustomSelect>
            </div>

            <div>
              <Label htmlFor="nameFilter">Beneficiary Name</Label>
              <Input
                id="nameFilter"
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing {filteredEntries.length} of {allLedgerEntries.length} transactions
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filteredEntries}
            columns={columns}
            title="Complete Transaction Ledger"
            csvFilename="ledger-data.csv"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Ledger;