import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAtom } from 'jotai';
import { purchasesAtom, addPurchaseAtom, updatePurchaseAtom, deletePurchaseAtom } from '../store/data';
import { formatCurrency, formatQuantity, formatDateTime, generateOrderNumber } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle, PencilIcon, TrashIcon } from 'lucide-react';
import EditTransactionModal from '../components/edit-transaction-modal';
import { PurchaseEntry, Bank, Platform } from '../types';

const Purchase = () => {
  const [purchases] = useAtom(purchasesAtom);
  const [, addPurchase] = useAtom(addPurchaseAtom);
  const [, updatePurchase] = useAtom(updatePurchaseAtom);
  const [, deletePurchase] = useAtom(deletePurchaseAtom);
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form state for calculations
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [isManualQuantity, setIsManualQuantity] = useState(false);
  
  // Auto-calculate quantity when total price or price changes
  useEffect(() => {
    if (!isManualQuantity && totalPrice && price && parseFloat(price) > 0) {
      const calculatedQuantity = parseFloat(totalPrice) / parseFloat(price);
      // Format to 8 decimal places maximum
      setQuantity(calculatedQuantity.toFixed(8));
    }
  }, [totalPrice, price, isManualQuantity]);
  
  // Handle manual quantity change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsManualQuantity(true);
    setQuantity(e.target.value);
  };
  
  // Handle total price change
  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalPrice(e.target.value);
    setIsManualQuantity(false);
  };
  
  // Handle price change
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
    setIsManualQuantity(false);
  };
  
  // Reset form fields when form is closed/opened
  useEffect(() => {
    if (showForm) {
      setTotalPrice('');
      setPrice('');
      setQuantity('');
      setIsManualQuantity(false);
    }
  }, [showForm]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const newPurchase = {
      orderNumber: generateOrderNumber(),
      bank: formData.get('bank') as Bank,
      orderType: 'Buy' as const,
      assetType: formData.get('assetType') as string,
      fiatType: formData.get('fiatType') as 'INR' | 'USDT',
      totalPrice: parseFloat(formData.get('totalPrice') as string),
      price: parseFloat(formData.get('price') as string),
      quantity: parseFloat(formData.get('quantity') as string),
      platform: formData.get('platform') as Platform,
      name: formData.get('name') as string,
      time: new Date().toLocaleTimeString(),
      contactNo: formData.get('contactNo') as string || undefined,
    };
    
    addPurchase(newPurchase);
    e.currentTarget.reset();
    setShowForm(false);
  };
  
  const handleEdit = (purchase: PurchaseEntry) => {
    setEditingPurchase(purchase);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = useCallback((purchase: PurchaseEntry) => {
    if (window.confirm("Are you sure you want to delete this purchase?")) {
      deletePurchase(purchase.id);
      alert("Purchase deleted successfully");
    }
  }, [deletePurchase]);
  
  const handleSaveEdit = (updatedData: any) => {
    updatePurchase({
      ...updatedData,
      // Ensure createdAt remains as a Date object
      createdAt: new Date(updatedData.createdAt)
    });
    setEditingPurchase(null);
  };
  
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
        <h1 className="text-2xl font-bold">Purchase Management</h1>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'New Purchase'}
        </Button>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Purchase Entry</CardTitle>
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
                    placeholder: "Enter Total Price",
                    value: totalPrice,
                    onChange: handleTotalPriceChange
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
                    placeholder: "Enter Price",
                    value: price,
                    onChange: handlePriceChange
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
                    placeholder: "Enter Quantity or Auto-calculate",
                    value: quantity,
                    onChange: handleQuantityChange
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
              
              <div className="flex justify-end mt-4">
                <Button type="submit">
                  Submit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <DataTable
        data={purchases}
        columns={columns}
        rowActions={rowActions}
        title="Purchases List"
      />
      
      {editingPurchase && (
        <EditTransactionModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          data={editingPurchase}
          onSave={handleSaveEdit}
          type="purchase"
        />
      )}
    </div>
  );
};

export default Purchase;