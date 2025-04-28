import React, { useState, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { salesAtom, addSaleAtom, updateSaleAtom, deleteSaleAtom } from '../store/data';
import { formatCurrency, formatQuantity, formatDateTime, generateOrderNumber } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle, PencilIcon, TrashIcon } from 'lucide-react';
import EditTransactionModal from '../components/edit-transaction-modal';
import { SalesEntry, Bank, Platform, Currency } from '../types';

const Sales = () => {
  const [sales] = useAtom(salesAtom);
  const [, addSale] = useAtom(addSaleAtom);
  const [, updateSale] = useAtom(updateSaleAtom);
  const [, deleteSale] = useAtom(deleteSaleAtom);
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const newSale = {
      orderNumber: generateOrderNumber(),
      bank: formData.get('bank') as Bank,
      orderType: 'Sell' as const,
      assetType: formData.get('assetType') as string,
      fiatType: formData.get('fiatType') as Currency,
      totalPrice: parseFloat(formData.get('totalPrice') as string),
      price: parseFloat(formData.get('price') as string),
      quantity: parseFloat(formData.get('quantity') as string),
      platform: formData.get('platform') as Platform,
      name: formData.get('name') as string,
      time: new Date().toLocaleTimeString(),
      contactNo: formData.get('contactNo') as string || undefined,
    };
    
    addSale(newSale);
    e.currentTarget.reset();
    setShowForm(false);
  };
  
  const handleEdit = (sale: SalesEntry) => {
    setEditingSale(sale);
    setIsEditModalOpen(true);
  };
  
  const handleSaveEdit = (updatedData: any) => {
    updateSale({
      ...updatedData,
      // Ensure createdAt remains as a Date object
      createdAt: new Date(updatedData.createdAt)
    });
    setEditingSale(null);
  };
  
  const handleDelete = useCallback((sale: SalesEntry) => {
    if (window.confirm("Are you sure you want to delete this sale?")) {
      deleteSale(sale.id);
      alert("Sale deleted successfully");
    }
  }, [deleteSale]);
  
  const columns = useMemo(() => [
    { key: 'orderNumber', label: 'Order #' },
    { key: 'bank', label: 'Bank' },
    { key: 'platform', label: 'Platform' },
    { 
      key: 'totalPrice', 
      label: 'Total Price', 
      formatter: (value: number) => formatCurrency(value)
    },
    { 
      key: 'price', 
      label: 'Price',
      formatter: (value: number) => value
    },
    { 
      key: 'quantity', 
      label: 'Quantity',
      formatter: (value: number) => formatQuantity(value)
    },
    { key: 'name', label: 'Name' },
    { 
      key: 'createdAt', 
      label: 'Created At',
      formatter: (value: Date) => formatDateTime(new Date(value))
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
  
  const banks = [
    { value: 'IDBI', label: 'IDBI' },
    { value: 'INDUSIND SS', label: 'INDUSIND SS' },
    { value: 'HDFC CAA SS', label: 'HDFC CAA SS' },
    { value: 'BOB SS', label: 'BOB SS' },
    { value: 'CANARA SS', label: 'CANARA SS' },
    { value: 'HDFC SS', label: 'HDFC SS' },
    { value: 'INDUSIND BLYNK', label: 'INDUSIND BLYNK' },
    { value: 'PNB', label: 'PNB' },
  ];
  
  const currencies = [
    { value: 'USDT', label: 'USDT' },
    { value: 'INR', label: 'INR' },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Management</h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'New Sale'}
        </Button>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Sale Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Bank"
                  name="bank"
                  type="select"
                  required
                  options={banks}
                />
                
                <FormField
                  label="Platform"
                  name="platform"
                  type="select"
                  required
                  options={platforms}
                />
                
                <FormField
                  label="Asset Type"
                  name="assetType"
                  required
                  inputProps={{ 
                    placeholder: "Enter Asset Type"
                  }}
                />
                
                <FormField
                  label="Fiat Type"
                  name="fiatType"
                  type="select"
                  required
                  options={currencies}
                />
                
                <FormField
                  label="Total Price"
                  name="totalPrice" 
                  type="number"
                  required
                  inputProps={{ 
                    step: "0.01",
                    min: "0",
                    placeholder: "Enter Total Price"
                  }}
                />
                
                <FormField
                  label="Price"
                  name="price"
                  type="number"
                  required
                  inputProps={{ 
                    step: "0.01",
                    min: "0",
                    placeholder: "Enter Price"
                  }}
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
                
                <FormField
                  label="Name"
                  name="name"
                  required
                  inputProps={{ 
                    placeholder: "Enter Name"
                  }}
                />
                
                <FormField
                  label="Contact No."
                  name="contactNo"
                  inputProps={{ 
                    placeholder: "Enter Contact Number (Optional)"
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
                <Button type="submit">
                  Save Sale
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <DataTable 
            data={sales} 
            columns={columns} 
            title="Sales Transactions"
            csvFilename="sales-data.csv"
            rowActions={rowActions}
          />
        </div>
        
        {sales.length > 0 && (
          <div className="p-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">Total Sales:</span>
                <span className="ml-2 font-bold text-green-600">
                  {formatCurrency(sales.reduce((sum, sale) => sum + sale.totalPrice, 0))}
                </span>
              </div>
              <div>
                <span className="font-medium">Number of Transactions:</span>
                <span className="ml-2 font-bold">{sales.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Transaction Modal */}
      {editingSale && (
        <EditTransactionModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={handleSaveEdit}
          data={editingSale}
          type="sale"
          platforms={platforms}
          banks={banks}
        />
      )}
    </div>
  );
};

export default Sales;