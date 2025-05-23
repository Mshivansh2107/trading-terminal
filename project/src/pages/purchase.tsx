import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAtom } from 'jotai';
import { purchasesAtom, addPurchaseAtom, updatePurchaseAtom, deletePurchaseAtom, banksAtom, platformsAtom, refreshDataAtom } from '../store/data';
import { formatCurrency, formatQuantity, formatDateTime, calculateBankTotal } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle, PencilIcon, TrashIcon, RefreshCw } from 'lucide-react';
import EditTransactionModal from '../components/edit-transaction-modal';
import { PurchaseEntry, Bank, Platform } from '../types';
import DateRangeFilter from '../components/date-range-filter';
import { filterByDateAtom, dateRangeAtom } from '../store/filters';
import BalanceWarning from '../components/ui/balance-warning';
import { salesAtom, expensesAtom, bankTransfersAtom } from '../store/data';

const Purchase = () => {
  const [purchases] = useAtom(purchasesAtom);
  const [sales] = useAtom(salesAtom);
  const [expenses] = useAtom(expensesAtom);
  const [bankTransfers] = useAtom(bankTransfersAtom);
  const [, addPurchase] = useAtom(addPurchaseAtom);
  const [, updatePurchase] = useAtom(updatePurchaseAtom);
  const [, deletePurchase] = useAtom(deletePurchaseAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filterByDate] = useAtom(filterByDateAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  const [banks] = useAtom(banksAtom);
  const [platforms] = useAtom(platformsAtom);
  
  // Form state for calculations
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [isManualQuantity, setIsManualQuantity] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | ''>('');
  
  // Calculate current bank balance
  const currentBankBalance = useMemo(() => {
    if (!selectedBank) return 0;
    
    // Calculate sales (money in)
    const salesTotal = sales
      .filter(s => s.bank === selectedBank)
      .reduce((sum, s) => sum + s.totalPrice, 0);
    
    // Calculate purchases (money out)
    const purchasesTotal = purchases
      .filter(p => p.bank === selectedBank)
      .reduce((sum, p) => sum + p.totalPrice, 0);
    
    // Calculate expenses
    const expensesTotal = expenses
      .filter(e => e.bank === selectedBank)
      .reduce((sum, e) => sum + (e.type === 'expense' ? e.amount : -e.amount), 0);
    
    // Calculate bank transfers
    const transfersIn = bankTransfers
      .filter(t => t.toBank === selectedBank && t.fromBank !== 'ADJUSTMENT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const transfersOut = bankTransfers
      .filter(t => t.fromBank === selectedBank && t.toBank !== 'ADJUSTMENT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate adjustment transfers
    const adjustmentIn = bankTransfers
      .filter(t => t.fromBank === 'ADJUSTMENT' && t.toBank === selectedBank)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const adjustmentOut = bankTransfers
      .filter(t => t.fromBank === selectedBank && t.toBank === 'ADJUSTMENT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return salesTotal - purchasesTotal - expensesTotal + transfersIn - transfersOut + adjustmentIn - adjustmentOut;
  }, [selectedBank, sales, purchases, expenses, bankTransfers]);

  // Calculate projected bank balance after purchase
  const projectedBankBalance = useMemo(() => {
    if (!selectedBank || !totalPrice) return currentBankBalance;
    return currentBankBalance - parseFloat(totalPrice);
  }, [currentBankBalance, selectedBank, totalPrice]);

  // Check if the purchase would result in negative balance
  const wouldResultInNegativeBalance = useMemo(() => {
    return projectedBankBalance < 0;
  }, [projectedBankBalance]);
  
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

  // Handle bank change
  const handleBankChange = (value: Bank) => {
    setSelectedBank(value);
  };
  
  // Reset form fields when form is closed/opened
  useEffect(() => {
    if (!showForm) {
      setTotalPrice('');
      setPrice('');
      setQuantity('');
      setIsManualQuantity(false);
      setSelectedBank('');
    }
  }, [showForm]);
  
  // Handle data refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh data when date range changes
  useEffect(() => {
    // We don't need to call refreshData here, as the filter is reactive
    // Just log that the date range changed for debugging
    console.log("Date range changed, refreshing filtered purchase data");
  }, [dateRange]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // If there would be negative balance, show confirmation
    if (wouldResultInNegativeBalance) {
      const confirmed = window.confirm(
        `Warning: This purchase would result in a negative balance of ${formatCurrency(Math.abs(projectedBankBalance))} for ${selectedBank}.\n\nDo you want to proceed anyway?`
      );
      if (!confirmed) return;
    }
    
    const formData = new FormData(e.currentTarget);
    const newPurchase = {
      orderNumber: formData.get('orderNumber') as string,
      bank: formData.get('bank') as Bank,
      orderType: 'Buy' as const,
      assetType: formData.get('assetType') as string,
      fiatType: 'USDT' as 'INR' | 'USDT', // Default to USDT
      totalPrice: parseFloat(formData.get('totalPrice') as string),
      price: parseFloat(formData.get('price') as string),
      quantity: parseFloat(formData.get('quantity') as string),
      platform: formData.get('platform') as Platform,
      name: formData.get('name') as string,
      time: new Date().toLocaleTimeString(),
      contactNo: formData.get('contactNo') as string || undefined,
      createdBy: '' // The actual value will be set by the addPurchaseAtom
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
  
  // Optimize columns for mobile view - show fewer columns on smaller screens
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
      key: 'createdBy', 
      label: 'Created By',
      formatter: (value: string) => value || '-'
    },
    // These columns can be hidden on mobile or smaller viewports
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
  
  // Replace hardcoded platforms with data from database
  const platformOptions = useMemo(() => {
    // Use platforms from the store if available
    if (platforms && platforms.length > 0) {
      return platforms
        .filter(platform => platform.isActive)
        .map(platform => ({
          value: platform.name,
          label: platform.name
        }));
    }
    
    // Return empty array if no platforms are available
    return [];
  }, [platforms]);
  
  // Filter purchases data by date range
  const filteredPurchases = useMemo(() => {
    return filterByDate(purchases);
  }, [filterByDate, purchases, dateRange]);

  // Fetch data on initial load
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full p-3 md:p-4 max-w-[100vw]">
      {/* Fixed header area */}
      <div className="flex flex-col space-y-4 w-full mb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold">Purchase Management</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeFilter />
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {showForm ? 'Cancel' : 'New Purchase'}
            </Button>
          </div>
        </div>
      
        {showForm && (
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle>New Purchase Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FormField
                    label="Order Number"
                    name="orderNumber"
                    required
                    inputProps={{ 
                      placeholder: "Enter Order Number"
                    }}
                  />
                  
                  <FormField
                    label="Bank"
                    name="bank"
                    type="select"
                    required
                    options={banks.map(bank => ({
                      value: bank.name,
                      label: bank.name
                    }))}
                    inputProps={{
                      onChange: (e) => handleBankChange(e.target.value as Bank)
                    }}
                  />
                  
                  <FormField
                    label="Platform"
                    name="platform"
                    type="select"
                    required
                    options={platformOptions}
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
                      placeholder: "Auto-calculated",
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
                      placeholder: "Contact Number (Optional)"
                    }}
                  />
                </div>
                
                {wouldResultInNegativeBalance && (
                  <BalanceWarning 
                    message={`This purchase would result in a negative balance of ${formatCurrency(Math.abs(projectedBankBalance))} for ${selectedBank}`}
                  />
                )}
                
                <div className="flex justify-end mt-4">
                  <Button type="submit">
                    Submit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Dedicated DataTable container with fixed width */}
      <div className="w-full" style={{ overflowX: 'hidden' }}>
        <DataTable 
          data={filteredPurchases}
          columns={columns} 
          rowActions={rowActions}
          title="Purchase List"
        />
      </div>
      
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