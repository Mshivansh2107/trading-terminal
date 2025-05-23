import React, { useState, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { bankTransfersAtom, addBankTransferAtom, updateBankTransferAtom, deleteBankTransferAtom, banksAtom } from '../store/data';
import { formatQuantity, formatDateTime, formatCurrency } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle, PencilIcon, TrashIcon, EyeOff } from 'lucide-react';
import EditTransactionModal from '../components/edit-transaction-modal';
import { BankTransferEntry } from '../types';
import DateRangeFilter from '../components/date-range-filter';
import { filterByDateAtom, dateRangeAtom } from '../store/filters';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';

const BankTransfer = () => {
  const [bankTransfers] = useAtom(bankTransfersAtom);
  const [, addBankTransfer] = useAtom(addBankTransferAtom);
  const [, updateBankTransfer] = useAtom(updateBankTransferAtom);
  const [, deleteBankTransfer] = useAtom(deleteBankTransferAtom);
  const [showForm, setShowForm] = useState(false);
  const [editingBankTransfer, setEditingBankTransfer] = useState<BankTransferEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [banks] = useAtom(banksAtom);
  const [filterByDate] = useAtom(filterByDateAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  const [hideAdjustments, setHideAdjustments] = useState(false);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const newBankTransfer = {
      fromBank: formData.get('fromBank') as string,
      fromAccount: 'Main', // Use 'Main' as default value
      toBank: formData.get('toBank') as string,
      toAccount: 'Main', // Use 'Main' as default value
      amount: parseFloat(formData.get('amount') as string),
      reference: formData.get('reference') as string || undefined,
      createdBy: '' // The actual value will be set by the addBankTransferAtom
    };
    
    addBankTransfer(newBankTransfer);
    e.currentTarget.reset();
    setShowForm(false);
  };
  
  const handleEdit = (bankTransfer: BankTransferEntry) => {
    setEditingBankTransfer(bankTransfer);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = useCallback((bankTransfer: BankTransferEntry) => {
    if (window.confirm("Are you sure you want to delete this bank transfer?")) {
      deleteBankTransfer(bankTransfer.id);
      alert("Bank transfer deleted successfully");
    }
  }, [deleteBankTransfer]);
  
  const handleSaveEdit = (updatedData: any) => {
    updateBankTransfer({
      ...updatedData,
      // Ensure createdAt remains as a Date object
      createdAt: new Date(updatedData.createdAt)
    });
    setEditingBankTransfer(null);
  };
  
  const columns = useMemo(() => [
    { key: 'fromBank', label: 'From Bank' },
    { key: 'fromAccount', label: 'From Account' },
    { key: 'toBank', label: 'To Bank' },
    { key: 'toAccount', label: 'To Account' },
    { 
      key: 'amount', 
      label: 'Amount',
      formatter: (value: number) => formatCurrency(value)
    },
    { 
      key: 'reference', 
      label: 'Reference'
    },
    { 
      key: 'createdAt', 
      label: 'Created At',
      formatter: (value: Date) => formatDateTime(new Date(value))
    },
    { 
      key: 'createdBy', 
      label: 'Created By',
      formatter: (value: string) => value || '-'
    },
    { 
      key: 'editedBy', 
      label: 'Last Edited By',
      formatter: (value: string | undefined) => value || '-'
    },
    { 
      key: 'updatedAt', 
      label: 'Last Updated',
      formatter: (value: Date | undefined) => value ? formatDateTime(new Date(value)) : '-'
    }
  ], []);

  // Add actions for the data table
  const rowActions = useMemo(() => [
    {
      label: 'Edit',
      icon: <PencilIcon className="h-4 w-4" />,
      onClick: handleEdit,
      variant: 'ghost' as const
    },
    {
      label: 'Delete',
      icon: <TrashIcon className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'ghost' as const
    }
  ], [handleEdit, handleDelete]);
  
  // Get bank options from the store
  const bankOptions = useMemo(() => {
    // Use banks from the store if available
    if (banks && banks.length > 0) {
      return banks
        .filter(bank => bank.isActive)
        .map(bank => ({
          value: bank.name,
          label: bank.name
        }));
    }
    
    // Return empty array if no banks are available
    return [];
  }, [banks]);
  
  const accounts = [
    { value: 'Main', label: 'Main Account' },
    { value: 'Secondary', label: 'Secondary Account' },
    { value: 'Savings', label: 'Savings Account' },
    { value: 'Business', label: 'Business Account' },
  ];
  
  // Compute bank totals
  const bankTotals = useMemo(() => {
    const totals = new Map();
    
    // Initialize all banks with zeros
    bankOptions.forEach(bank => {
      totals.set(bank.value, { bank: bank.value, sent: 0, received: 0, net: 0 });
    });
    
    // Calculate totals
    bankTransfers.forEach(transfer => {
      // Update "from" bank (sending money)
      if (totals.has(transfer.fromBank)) {
        const fromBankData = totals.get(transfer.fromBank);
        fromBankData.sent += transfer.amount;
        fromBankData.net -= transfer.amount;
        totals.set(transfer.fromBank, fromBankData);
      }
      
      // Update "to" bank (receiving money)
      if (totals.has(transfer.toBank)) {
        const toBankData = totals.get(transfer.toBank);
        toBankData.received += transfer.amount;
        toBankData.net += transfer.amount;
        totals.set(transfer.toBank, toBankData);
      }
    });
    
    // Convert map to array and filter out empty banks
    return Array.from(totals.values())
      .filter(item => item.sent > 0 || item.received > 0)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [bankTransfers, bankOptions]);

  // Filter bank transfers data by date range
  const filteredBankTransfers = useMemo(() => {
    // First filter by date
    let filtered = filterByDate(bankTransfers);
    
    // Then filter out adjustment entries if option is enabled
    if (hideAdjustments) {
      filtered = filtered.filter(transfer => 
        transfer.fromBank !== 'ADJUSTMENT' && 
        transfer.toBank !== 'ADJUSTMENT' &&
        !transfer.reference?.includes('Manual balance adjustment')
      );
    }
    
    return filtered;
  }, [filterByDate, bankTransfers, dateRange, hideAdjustments]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bank Transfers</h1>
        <div className="flex items-center gap-2">
          <DateRangeFilter />
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {showForm ? 'Cancel' : 'New Transfer'}
          </Button>
        </div>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Bank Transfer Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="From Bank"
                  name="fromBank"
                  type="select"
                  required
                  options={bankOptions}
                />
                
                <FormField
                  label="To Bank"
                  name="toBank"
                  type="select"
                  required
                  options={bankOptions}
                />
                
                <FormField
                  label="Amount"
                  name="amount" 
                  type="number"
                  required
                  inputProps={{ 
                    step: "0.01",
                    min: "0",
                    placeholder: "Enter Amount"
                  }}
                />
                
                <FormField
                  label="Reference"
                  name="reference" 
                  type="text"
                  inputProps={{ 
                    placeholder: "Enter Reference (Optional)"
                  }}
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="secondary">
                  Save Bank Transfer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hideAdjustments" 
                  checked={hideAdjustments} 
                  onCheckedChange={(checked) => setHideAdjustments(!!checked)} 
                />
                <Label 
                  htmlFor="hideAdjustments"
                  className="text-sm font-medium flex items-center cursor-pointer"
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1 text-gray-500" />
                  Hide adjustment entries
                </Label>
              </div>
            </div>
            <DataTable 
              data={filteredBankTransfers} 
              columns={columns}
              title="Transfer History"
              csvFilename="bank-transfers-data.csv"
              rowActions={rowActions}
            />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Bank Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-500 border-b pb-2">
                  <div>Bank</div>
                  <div className="text-right">Sent</div>
                  <div className="text-right">Received</div>
                  <div className="text-right">Net</div>
                </div>
                
                {bankTotals.length > 0 ? (
                  bankTotals.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 text-sm">
                      <div className="font-medium">{item.bank}</div>
                      <div className="text-right text-red-600">{formatCurrency(item.sent)}</div>
                      <div className="text-right text-green-600">{formatCurrency(item.received)}</div>
                      <div className={`text-right font-semibold ${item.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.net)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No bank transfer data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Transaction Modal */}
      {editingBankTransfer && (
        <EditTransactionModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={handleSaveEdit}
          data={editingBankTransfer}
          type="bankTransfer"
          banks={bankOptions}
          accounts={accounts}
        />
      )}
    </div>
  );
};

export default BankTransfer; 