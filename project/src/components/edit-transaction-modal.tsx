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
import FormField from './layout/form-field';
import { formatDateTime } from '../lib/utils';
import { Bank, Platform } from '../types';

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

// Custom FormField component that handles value and onChange separately
const CustomFormField: React.FC<{
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  options?: Option[];
  inputProps?: any;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}> = ({ 
  label, 
  name, 
  type = 'text', 
  required = false,
  options,
  inputProps,
  value,
  onChange 
}) => {
  // Create a ref to hold the input element
  const inputRef = React.useRef<HTMLInputElement | HTMLSelectElement>(null);
  
  // Update the value of the input when our value prop changes
  React.useEffect(() => {
    if (inputRef.current) {
      // For select elements, we can't just set value
      if (inputRef.current.tagName.toLowerCase() === 'select') {
        const selectElement = inputRef.current as HTMLSelectElement;
        selectElement.value = value?.toString() || '';
      } else {
        const inputElement = inputRef.current as HTMLInputElement;
        inputElement.value = value?.toString() || '';
      }
    }
  }, [value]);
  
  return (
    <FormField
      label={label}
      name={name}
      type={type}
      required={required}
      options={options}
      inputProps={{
        ...inputProps,
        ref: inputRef,
        onChange: onChange,
        defaultValue: value
      }}
    />
  );
};

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  open,
  onOpenChange,
  onSave,
  data,
  type,
  platforms = [],
  banks = [],
  accounts = [],
  expenseCategories = [],
  incomeCategories = []
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isManualQuantity, setIsManualQuantity] = useState(true);
  
  // Initialize form data when modal opens or data changes
  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    }
  }, [data, open]);

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
    onSave(formData);
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
              <CustomFormField
                label="Bank"
                name="bank"
                type="select"
                required
                options={banks}
                value={formData.bank as Bank}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Platform"
                name="platform"
                type="select"
                required
                options={platforms}
                value={formData.platform as Platform}
                onChange={handleChange}
              />

              <CustomFormField
                label="Asset Type"
                name="assetType"
                required
                value={formData.assetType}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Fiat Type"
                name="fiatType"
                type="select"
                required
                options={[
                  { value: 'USDT', label: 'USDT' },
                  { value: 'INR', label: 'INR' }
                ]}
                value={formData.fiatType}
                onChange={handleChange}
              />

              <CustomFormField
                label="Total Price"
                name="totalPrice" 
                type="number"
                required
                inputProps={{ 
                  step: "0.01",
                  min: "0",
                }}
                value={formData.totalPrice}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Price"
                name="price" 
                type="number"
                required
                inputProps={{ 
                  step: "0.01",
                  min: "0",
                }}
                value={formData.price}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Quantity"
                name="quantity" 
                type="number"
                required
                inputProps={{ 
                  step: "0.00000001",
                  min: "0",
                }}
                value={formData.quantity}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Contact No."
                name="contactNo"
                inputProps={{ 
                  placeholder: "Enter Contact Number (Optional)"
                }}
                value={formData.contactNo || ''}
                onChange={handleChange}
              />
            </div>
          </>
        );
        
      case 'transfer':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CustomFormField
                label="From Platform"
                name="from"
                type="select"
                required
                options={platforms}
                value={formData.from || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="To Platform"
                name="to"
                type="select" 
                required
                options={platforms}
                value={formData.to || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Quantity"
                name="quantity" 
                type="number"
                required
                inputProps={{ 
                  step: "0.00000001",
                  min: "0",
                }}
                value={formData.quantity || ''}
                onChange={handleChange}
              />
            </div>
          </>
        );
        
      case 'bankTransfer':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomFormField
                label="From Bank"
                name="fromBank"
                type="select"
                required
                options={banks}
                value={formData.fromBank || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="From Account"
                name="fromAccount"
                type="select"
                required
                options={accounts}
                value={formData.fromAccount || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="To Bank"
                name="toBank"
                type="select"
                required
                options={banks}
                value={formData.toBank || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="To Account"
                name="toAccount"
                type="select"
                required
                options={accounts}
                value={formData.toAccount || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Amount"
                name="amount" 
                type="number"
                required
                inputProps={{ 
                  step: "0.01",
                  min: "0",
                }}
                value={formData.amount || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Reference"
                name="reference" 
                inputProps={{ 
                  placeholder: "Enter Reference (Optional)"
                }}
                value={formData.reference || ''}
                onChange={handleChange}
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
              <CustomFormField
                label="Bank"
                name="bank"
                type="select"
                required
                options={banks}
                value={formData.bank || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Amount"
                name="amount" 
                type="number"
                required
                inputProps={{ 
                  step: "0.01",
                  min: "0",
                }}
                value={formData.amount || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Category"
                name="category"
                type="select"
                required
                options={categories}
                value={formData.category || ''}
                onChange={handleChange}
              />
              
              <CustomFormField
                label="Description"
                name="description"
                inputProps={{ 
                  placeholder: "Enter Description (Optional)"
                }}
                value={formData.description || ''}
                onChange={handleChange}
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
      <DialogContent className="sm:max-w-[700px]">
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