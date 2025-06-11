import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';
import FormField from './layout/form-field';
import { formatDateTime } from '../lib/utils';
import { Bank, Platform } from '../types';
import { useAtom } from 'jotai';
import { platformsAtom, banksAtom, fetchPlatformsAtom, fetchBanksAtom, beneficiariesAtom } from '../store/data';
import { PlatformSelector } from './ui/platform-selector';
import { BankSelector } from './ui/bank-selector';
import { BeneficiarySelector } from './ui/beneficiary-selector';

interface Option {
  value: string;
  label: string;
}

export type TransactionType = 'sale' | 'purchase' | 'transfer' | 'bankTransfer' | 'expense';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (formData: Record<string, any>) => void;
  data: Record<string, any>;
  type: TransactionType;
  platforms?: Option[];
  banks?: Option[];
  accounts?: Option[];
  expenseCategories?: Option[];
  incomeCategories?: Option[];
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  open,
  onOpenChange,
  onSave,
  data,
  type,
  platforms: providedPlatforms,
  banks: providedBanks,
  accounts,
  expenseCategories,
  incomeCategories
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isManualQuantity, setIsManualQuantity] = useState(true);
  
  // Get platforms, banks, and beneficiaries from store
  const [platformsData] = useAtom(platformsAtom);
  const [banksData] = useAtom(banksAtom);
  const [beneficiaries] = useAtom(beneficiariesAtom);
  const [, fetchPlatforms] = useAtom(fetchPlatformsAtom);
  const [, fetchBanks] = useAtom(fetchBanksAtom);
  
  // Load platforms and banks when modal opens
  useEffect(() => {
    if (open) {
      console.log('EditTransactionModal opened, loading data...');
      
      // Fetch platforms and banks data
      Promise.all([
        fetchPlatforms(),
        fetchBanks()
      ]).then(() => {
        console.log('Platforms and banks loaded successfully');
        console.log('Available platforms:', platformsData);
        console.log('Available banks:', banksData);
      }).catch(error => {
        console.error('Error loading data:', error);
      });
    }
  }, [open, fetchPlatforms, fetchBanks]);

  // Generate platform options
  const platformOptions = React.useMemo(() => {
    // Use provided platforms if available
    if (providedPlatforms && providedPlatforms.length > 0) {
      return providedPlatforms;
    }
    
    // Otherwise use platforms from store
    if (platformsData && platformsData.length > 0) {
      return platformsData
        .filter(platform => platform.isActive)
        .map(platform => ({
          value: platform.name,
          label: platform.name
        }));
    }
    
    // Return empty array if no platforms are available
    return [];
  }, [providedPlatforms, platformsData]);
  
  // Generate bank options
  const bankOptions = React.useMemo(() => {
    // Use provided banks if available
    if (providedBanks && providedBanks.length > 0) {
      return providedBanks;
    }
    
    // Otherwise use banks from store
    if (banksData && banksData.length > 0) {
      return banksData
        .filter(bank => bank.isActive)
        .map(bank => ({
          value: bank.name,
          label: bank.name
        }));
    }
    
    // Return empty array if no banks are available
    return [];
  }, [providedBanks, banksData]);
  
  // Initialize form data when modal opens or data changes
  useEffect(() => {
    if (data) {
      // For transfer type, ensure from and to are proper strings
      if (type === 'transfer') {
        setFormData({
          ...data,
          from: data.from || '',
          to: data.to || '',
          quantity: data.quantity || ''
        });
      } else {
        setFormData({ ...data });
      }
    }
  }, [data, open, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let updatedFormData = { ...formData, [name]: value };
    
    // Auto-calculate quantity when totalPrice or price changes
    if ((name === 'totalPrice' || name === 'price') && !isManualQuantity) {
      const totalPrice = name === 'totalPrice' ? parseFloat(value) : parseFloat(updatedFormData.totalPrice);
      const price = name === 'price' ? parseFloat(value) : parseFloat(updatedFormData.price);
      
      if (!isNaN(totalPrice) && !isNaN(price) && price > 0) {
        const calculatedQuantity = totalPrice / price;
        updatedFormData.quantity = calculatedQuantity.toFixed(8);
      }
    }
    
    // Mark as manual quantity if user directly edits quantity
    if (name === 'quantity') {
      setIsManualQuantity(true);
    } else if (name === 'totalPrice' || name === 'price') {
      setIsManualQuantity(false);
    }
    
    setFormData(updatedFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For bank transfers, ensure the account fields use 'Main' as default
    let dataToSave = formData;
    if (type === 'bankTransfer') {
      dataToSave = {
        ...formData,
        fromAccount: 'Main',
        toAccount: 'Main'
      };
    }
    
    onSave(dataToSave);
    onOpenChange(false);
  };

  // Render appropriate form fields based on transaction type
  const renderFormFields = () => {
    switch (type) {
      case 'sale':
      case 'purchase':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Order Number"
                name="orderNumber"
                required
                inputProps={{
                  value: formData.orderNumber,
                  onChange: handleChange
                }}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <BankSelector
                  value={formData.bank || ''}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      bank: value
                    });
                  }}
                  placeholder="Select bank"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <PlatformSelector
                  value={formData.platform || ''}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      platform: value
                    });
                  }}
                  placeholder="Select platform"
                  required
                />
              </div>

              <FormFiel
                label="Asset Type"
                name="assetType"
                required
                inputProps={{
                  value: formData.assetType,
                  onChange: handleChange
                }}
              />
              
              <FormField
                label="Fiat Type"
                name="fiatType"
                type="select"
                required
                options={[
                  { value: 'USDT', label: 'USDT' },
                  { value: 'INR', label: 'INR' }
                ]}
                inputProps={{
                  value: formData.fiatType,
                  onChange: handleChange
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
                  value: formData.totalPrice,
                  onChange: handleChange
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
                  value: formData.price,
                  onChange: handleChange
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
                  value: formData.quantity,
                  onChange: handleChange
                }}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beneficiary
                </label>
                <BeneficiarySelector
                  value={formData.beneficiaryId || ''}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      beneficiaryId: value
                    });
                  }}
                  placeholder="Select beneficiary (optional)"
                />
              </div>
              
              <FormField
                label="Name"
                name="name"
                required
                inputProps={{
                  value: formData.name,
                  onChange: handleChange
                }}
              />
              
              <FormField
                label="Contact No."
                name="contactNo"
                inputProps={{ 
                  placeholder: "Enter Contact Number (Optional)",
                  value: formData.contactNo || '',
                  onChange: handleChange
                }}
              />
            </div>
          </>
        );
        
      case 'transfer':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Platform
                </label>
                <PlatformSelector
                  value={formData.from || ''}
                  onChange={(value) => {
                    console.log('From platform selected:', value);
                    setFormData((prevData) => ({
                      ...prevData,
                      from: value
                    }));
                  }}
                  placeholder="Select from platform"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Platform
                </label>
                <PlatformSelector
                  value={formData.to || ''}
                  onChange={(value) => {
                    console.log('To platform selected:', value);
                    setFormData((prevData) => ({
                      ...prevData,
                      to: value
                    }));
                  }}
                  placeholder="Select to platform" 
                  required
                />
              </div>
              
              <FormField
                label="Quantity"
                name="quantity" 
                type="number"
                required
                inputProps={{ 
                  step: "0.00000001",
                  min: "0",
                  value: formData.quantity || '',
                  onChange: handleChange
                }}
              />
            </div>
          </>
        );
        
      case 'bankTransfer':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Bank
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <BankSelector
                  value={formData.fromBank || ''}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      fromBank: value
                    });
                  }}
                  placeholder="Select from bank"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Bank
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <BankSelector
                  value={formData.toBank || ''}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      toBank: value
                    });
                  }}
                  placeholder="Select to bank"
                  required
                />
              </div>
              
              <FormField
                label="Amount"
                name="amount" 
                type="number"
                required
                inputProps={{ 
                  step: "0.01",
                  min: "0",
                  value: formData.amount || '',
                  onChange: handleChange
                }}
              />
              
              <FormField
                label="Reference"
                name="reference" 
                inputProps={{ 
                  placeholder: "Enter Reference (Optional)",
                  value: formData.reference || '',
                  onChange: handleChange
                }}
              />
            </div>
          </>
        );
        
      case 'expense':
        const categories = formData.type === 'income' ? incomeCategories : expenseCategories;
        return (
          <>
            <div className="mb-4">
              <div className="flex space-x-4 mb-4">
                <Button 
                  type="button"
                  variant={formData.type === 'expense' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                  className="w-full"
                >
                  Expense
                </Button>
                <Button 
                  type="button"
                  variant={formData.type === 'income' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                  className="w-full"
                >
                  Income
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <BankSelector
                  value={formData.bank || ''}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      bank: value
                    });
                  }}
                  placeholder="Select bank"
                  required
                />
              </div>
              
              <FormField
                label="Amount"
                name="amount" 
                type="number"
                required
                inputProps={{ 
                  step: "0.01",
                  min: "0",
                  value: formData.amount || '',
                  onChange: handleChange
                }}
              />
              
              <FormField
                label="Category"
                name="category"
                type="select"
                required
                options={categories}
                inputProps={{
                  value: formData.category || '',
                  onChange: handleChange
                }}
              />
              
              <FormField
                label="Description"
                name="description"
                inputProps={{ 
                  placeholder: "Enter Description (Optional)",
                  value: formData.description || '',
                  onChange: handleChange
                }}
              />
            </div>
          </>
        );
        
      default:
        return <p>Unknown transaction type</p>;
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case 'sale': return 'Edit Sale';
      case 'purchase': return 'Edit Purchase';
      case 'transfer': return 'Edit Transfer';
      case 'bankTransfer': return 'Edit Bank Transfer';
      case 'expense': return `Edit ${formData.type === 'income' ? 'Income' : 'Expense'}`;
      default: return 'Edit Transaction';
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'sale': return 'default';
      case 'purchase': return 'secondary';
      case 'transfer': return 'secondary';
      case 'bankTransfer': return 'secondary';
      case 'expense': return formData.type === 'income' ? 'secondary' : 'destructive';
      default: return 'default';
    }
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription>
            Editing transaction from {formatDateTime(new Date(data.createdAt))}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {renderFormFields()}
          
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant={getVariant()}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionModal;