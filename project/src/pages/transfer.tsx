import React, { useState, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { transfersAtom, addTransferAtom, updateTransferAtom, deleteTransferAtom } from '../store/data';
import { formatQuantity, formatDateTime } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle, PencilIcon, TrashIcon } from 'lucide-react';
import EditTransactionModal from '../components/edit-transaction-modal';
import { TransferEntry, Platform } from '../types';

const Transfer = () => {
  const [transfers] = useAtom(transfersAtom);
  const [, addTransfer] = useAtom(addTransferAtom);
  const [, updateTransfer] = useAtom(updateTransferAtom);
  const [, deleteTransfer] = useAtom(deleteTransferAtom);
  const [showForm, setShowForm] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<TransferEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const newTransfer = {
      from: formData.get('from') as Platform,
      to: formData.get('to') as Platform,
      quantity: parseFloat(formData.get('quantity') as string),
    };
    
    addTransfer(newTransfer);
    e.currentTarget.reset();
    setShowForm(false);
  };
  
  const handleEdit = (transfer: TransferEntry) => {
    setEditingTransfer(transfer);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = useCallback((transfer: TransferEntry) => {
    if (window.confirm("Are you sure you want to delete this transfer?")) {
      deleteTransfer(transfer.id);
      alert("Transfer deleted successfully");
    }
  }, [deleteTransfer]);
  
  const handleSaveEdit = (updatedData: any) => {
    updateTransfer({
      ...updatedData,
      // Ensure createdAt remains as a Date object
      createdAt: new Date(updatedData.createdAt)
    });
    setEditingTransfer(null);
  };
  
  const columns = useMemo(() => [
    { key: 'from', label: 'From Platform' },
    { key: 'to', label: 'To Platform' },
    { 
      key: 'quantity', 
      label: 'Quantity',
      formatter: (value: number) => formatQuantity(value)
    },
    { 
      key: 'createdAt', 
      label: 'Date & Time',
      formatter: (value: Date) => formatDateTime(new Date(value))
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
  
  const platforms = [
    { value: 'BINANCE SS', label: 'BINANCE SS' },
    { value: 'BINANCE AS', label: 'BINANCE AS' },
    { value: 'BYBIT SS', label: 'BYBIT SS' },
    { value: 'BYBIT AS', label: 'BYBIT AS' },
    { value: 'BITGET SS', label: 'BITGET SS' },
    { value: 'BITGET AS', label: 'BITGET AS' },
    { value: 'KUCOIN SS', label: 'KUCOIN SS' },
    { value: 'KUCOIN AS', label: 'KUCOIN AS' },
  ];
  
  // Compute platform totals
  const platformTotals = useMemo(() => {
    const totals = new Map();
    
    // Initialize all platforms with zeros
    platforms.forEach(platform => {
      totals.set(platform.value, { platform: platform.value, from: 0, to: 0, net: 0 });
    });
    
    // Calculate totals
    transfers.forEach(transfer => {
      // Update "from" platform
      if (totals.has(transfer.from)) {
        const fromData = totals.get(transfer.from);
        fromData.from += transfer.quantity;
        fromData.net -= transfer.quantity;
        totals.set(transfer.from, fromData);
      }
      
      // Update "to" platform
      if (totals.has(transfer.to)) {
        const toData = totals.get(transfer.to);
        toData.to += transfer.quantity;
        toData.net += transfer.quantity;
        totals.set(transfer.to, toData);
      }
    });
    
    // Convert map to array and filter out empty platforms
    return Array.from(totals.values())
      .filter(item => item.from > 0 || item.to > 0)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [transfers, platforms]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transfer Management</h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'New Transfer'}
        </Button>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Transfer Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="From Platform"
                  name="from"
                  type="select"
                  required
                  options={platforms}
                />
                
                <FormField
                  label="To Platform"
                  name="to"
                  type="select" 
                  required
                  options={platforms}
                />
                
                <FormField
                  label="Quantity"
                  name="quantity" 
                  type="number"
                  required
                  inputProps={{ 
                    step: "0.00000001",
                    min: "0",
                    placeholder: "Enter Quantity"
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
                  Save Transfer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4">
            <DataTable 
              data={transfers} 
              columns={columns} 
              title="Transfer Transactions"
              csvFilename="transfers-data.csv"
              rowActions={rowActions}
            />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Platform Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-500 border-b pb-2">
                  <div>Platform</div>
                  <div className="text-right">From</div>
                  <div className="text-right">To</div>
                  <div className="text-right">Net</div>
                </div>
                
                {platformTotals.length > 0 ? (
                  platformTotals.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 text-sm">
                      <div className="font-medium">{item.platform}</div>
                      <div className="text-right text-red-600">{formatQuantity(item.from)}</div>
                      <div className="text-right text-green-600">{formatQuantity(item.to)}</div>
                      <div className={`text-right font-semibold ${item.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatQuantity(item.net)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">No transfer data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Transaction Modal */}
      {editingTransfer && (
        <EditTransactionModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={handleSaveEdit}
          data={editingTransfer}
          type="transfer"
          platforms={platforms}
        />
      )}
    </div>
  );
};

export default Transfer;