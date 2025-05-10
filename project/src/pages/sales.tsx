import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAtom } from 'jotai';
import { salesAtom, addSaleAtom, updateSaleAtom, deleteSaleAtom, banksAtom, platformsAtom, refreshDataAtom } from '../store/data';
import { formatCurrency, formatQuantity, formatDateTime, calculateStockBalance } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import FormField from '../components/layout/form-field';
import { PlusCircle, PencilIcon, TrashIcon, RefreshCw } from 'lucide-react';
import EditTransactionModal from '../components/edit-transaction-modal';
import { SalesEntry, Bank, Platform, Currency } from '../types';
import DateRangeFilter from '../components/date-range-filter';
import { filterByDateAtom, dateRangeAtom } from '../store/filters';
import BalanceWarning from '../components/ui/balance-warning';
import { purchasesAtom, transfersAtom } from '../store/data';

const Sales = () => {
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [transfers] = useAtom(transfersAtom);
  const [, addSale] = useAtom(addSaleAtom);
  const [, updateSale] = useAtom(updateSaleAtom);
  const [, deleteSale] = useAtom(deleteSaleAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [banks] = useAtom(banksAtom);
  const [platforms] = useAtom(platformsAtom);
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filterByDate] = useAtom(filterByDateAtom);
  const [dateRange] = useAtom(dateRangeAtom);
  
  // Form state for calculations
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [isManualQuantity, setIsManualQuantity] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | ''>('');
  const [selectedBank, setSelectedBank] = useState<Bank | ''>('');
  
  // Calculate current stock balance for the selected platform
  const currentStockBalance = useMemo(() => {
    if (!selectedPlatform) return 0;
    return calculateStockBalance(purchases, sales, transfers, selectedPlatform);
  }, [selectedPlatform, purchases, sales, transfers]);

  // Calculate projected stock balance after sale
  const projectedStockBalance = useMemo(() => {
    if (!selectedPlatform || !quantity) return currentStockBalance;
    return currentStockBalance - parseFloat(quantity);
  }, [currentStockBalance, selectedPlatform, quantity]);

  // Check if the sale would result in negative stock
  const wouldResultInNegativeStock = useMemo(() => {
    return projectedStockBalance < 0;
  }, [projectedStockBalance]);

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

  // Handle platform change
  const handlePlatformChange = (value: Platform) => {
    setSelectedPlatform(value);
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
      setSelectedPlatform('');
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
    console.log("Date range changed, refreshing filtered sales data");
  }, [dateRange]);
  
  // Fetch data on initial load
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // If there would be negative balance, show confirmation
    if (wouldResultInNegativeStock) {
      const confirmed = window.confirm(
        `Warning: This sale would result in a negative balance of ${Math.abs(projectedStockBalance).toFixed(8)} for ${selectedPlatform}.\n\nDo you want to proceed anyway?`
      );
      if (!confirmed) return;
    }
    
    const formData = new FormData(e.currentTarget);
    const newSale = {
      orderNumber: formData.get('orderNumber') as string,
      bank: formData.get('bank') as Bank,
      orderType: 'Sell' as const,
      assetType: formData.get('assetType') as string,
      fiatType: 'USDT' as Currency, // Default to USDT
      totalPrice: parseFloat(formData.get('totalPrice') as string),
      price: parseFloat(formData.get('price') as string),
      quantity: parseFloat(formData.get('quantity') as string),
      platform: formData.get('platform') as Platform,
      name: formData.get('name') as string,
      time: new Date().toLocaleTimeString(),
      contactNo: formData.get('contactNo') as string || undefined,
      createdBy: '' // The actual value will be set by the addSaleAtom
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
  
  // Rearrange columns to put the action column right after createdAt
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
    // These columns will appear after the action column now
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
  
  // Add a useMemo hook to get dynamic bank options
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

  // Filter sales data by date range
  const filteredSales = useMemo(() => {
    return filterByDate(sales);
  }, [filterByDate, sales, dateRange]);

  return (
    <div className="flex flex-col h-full p-3 md:p-4 max-w-[100vw]">
      {/* Fixed header area */}
      <div className="flex flex-col space-y-4 w-full mb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold">Sales Management</h1>
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
              {showForm ? 'Cancel' : 'New Sale'}
            </Button>
          </div>
        </div>
      
        {showForm && (
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle>New Sale Entry</CardTitle>
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
                    options={bankOptions}
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
                    inputProps={{
                      onChange: (e) => handlePlatformChange(e.target.value as Platform)
                    }}
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
                
                {wouldResultInNegativeStock && (
                  <BalanceWarning 
                    message={`This sale would result in a negative balance of ${Math.abs(projectedStockBalance).toFixed(8)} for ${selectedPlatform}`}
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
          data={filteredSales} 
          columns={columns} 
          rowActions={rowActions}
          title="Sales List"
        />
      </div>
      
      {editingSale && (
        <EditTransactionModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          data={editingSale}
          onSave={handleSaveEdit}
          type="sale"
        />
      )}
    </div>
  );
};

export default Sales;