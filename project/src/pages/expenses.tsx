import React, { useState, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import DataTable from '../components/data-table';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CustomSelect as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PlusCircle, Wallet, DollarSign, Edit, Delete, Minus, PencilIcon, TrashIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { expensesAtom, addExpenseAtom, updateExpenseAtom, deleteExpenseAtom, banksAtom } from '../store/data';
import { ExpenseEntry, Bank } from '../types';
import DeleteConfirmationDialog from '../components/delete-confirmation-dialog';
import DateRangeFilter from '../components/date-range-filter';
import { filterByDateAtom, dateRangeAtom } from '../store/filters';

// Constants for expense and income categories
const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Housing',
  'Healthcare',
  'Entertainment',
  'Education',
  'Shopping',
  'Utilities',
  'Travel',
  'Other',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Gifts',
  'Other',
];

// We'll use dynamic banks instead of this static list
// const BANKS: Bank[] = [
//   'IDBI',
//   'INDUSIND SS',
//   'HDFC CAA SS',
//   'BOB SS',
//   'CANARA SS',
//   'HDFC SS',
//   'INDUSIND BLYNK',
//   'PNB'
// ];

export default function Expenses() {
  // State for expenses and form visibility
  const [expenses, setExpenses] = useAtom(expensesAtom);
  const [, addExpense] = useAtom(addExpenseAtom);
  const [, updateExpense] = useAtom(updateExpenseAtom);
  const [, deleteExpense] = useAtom(deleteExpenseAtom);
  const [banks] = useAtom(banksAtom);
  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [filterByDate] = useAtom(filterByDateAtom);
  const [dateRange] = useAtom(dateRangeAtom);

  // Dynamic banks from banksAtom
  const BANKS = useMemo(() => {
    if (banks && banks.length > 0) {
      return banks
        .filter(bank => bank.isActive)
        .map(bank => bank.name as Bank);
    }
    // Fallback banks
    return [
      'IDBI',
      'INDUSIND SS',
      'HDFC CAA SS',
      'BOB SS',
      'CANARA SS',
      'HDFC SS',
      'INDUSIND BLYNK',
      'PNB'
    ] as Bank[];
  }, [banks]);

  // State for form inputs
  const [formData, setFormData] = useState({
    id: '',
    bank: '' as Bank,
    amount: '',
    category: '',
    description: '',
  });

  // State to track if we're editing an expense
  const [isEditing, setIsEditing] = useState(false);

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Filter expenses data by date range
  const filteredExpenses = useMemo(() => {
    return filterByDate(expenses);
  }, [filterByDate, expenses, dateRange]);

  // Calculate total expenses and income from filtered data
  const totalExpenses = filteredExpenses
    .filter(expense => expense.type === 'expense')
    .reduce((sum, expense) => sum + expense.amount, 0);

  const totalIncome = filteredExpenses
    .filter(expense => expense.type === 'income')
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const expenseData: ExpenseEntry = {
      id: isEditing ? formData.id : crypto.randomUUID(),
      bank: formData.bank,
      amount,
      type: transactionType,
      category: formData.category || undefined,
      description: formData.description || undefined,
      createdAt: new Date(),
      createdBy: '' // The actual value will be set by the addExpenseAtom
    };

    if (isEditing) {
      updateExpense(expenseData);
      alert("Transaction updated successfully");
    } else {
      addExpense(expenseData);
      alert("Transaction added successfully");
    }

    // Reset form
    setFormData({
      id: '',
      bank: '' as Bank,
      amount: '',
      category: '',
      description: '',
    });
    setShowForm(false);
    setIsEditing(false);
  };

  // Handle edit expense
  const handleEdit = (expense: ExpenseEntry) => {
    setFormData({
      id: expense.id,
      bank: expense.bank,
      amount: expense.amount.toString(),
      category: expense.category || '',
      description: expense.description || '',
    });
    setTransactionType(expense.type);
    setShowForm(true);
    setIsEditing(true);
  };

  // Handle delete expense
  const handleDelete = useCallback((expense: ExpenseEntry) => {
    if (window.confirm(`Are you sure you want to delete this ${expense.type}?`)) {
      deleteExpense(expense.id);
    }
  }, [deleteExpense]);

  // Define columns for the data table
  const columns = useMemo(() => [
    {
      key: 'type',
      label: 'Type',
      formatter: (value: string, row: ExpenseEntry) => (
        <div className="flex items-center">
          {value === 'income' ? (
            <DollarSign className="mr-2 h-4 w-4 text-green-500" />
          ) : (
            <Minus className="mr-2 h-4 w-4 text-red-500" />
          )}
          {value === 'income' ? 'Income' : 'Expense'}
        </div>
      )
    },
    {
      key: 'bank',
      label: 'Bank/Account',
      formatter: (value: Bank) => (
        <div className="flex items-center">
          <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
          {value}
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      formatter: (value: number, row: ExpenseEntry) => (
        <div className={row.type === 'income' ? 'text-green-500' : 'text-red-500'}>
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category'
    },
    {
      key: 'description',
      label: 'Description'
    },
    {
      key: 'createdAt',
      label: 'Date/Time',
      formatter: (value: Date) => value ? new Date(value).toLocaleString() : ''
    },
    {
      key: 'createdBy',
      label: 'Created By',
      formatter: (value: string) => value || '-'
    }
  ], []);

  // Add edit and delete actions
  const rowActions = useMemo(() => [
    {
      label: 'Edit',
      icon: <PencilIcon className="h-4 w-4" />,
      onClick: handleEdit
    },
    {
      label: 'Delete',
      icon: <TrashIcon className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'ghost' as const
    }
  ], [handleEdit, handleDelete]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Expenses & Income</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter />
          <Button 
            onClick={() => {
              setFormData({
                id: '',
                bank: '' as Bank,
                amount: '',
                category: '',
                description: '',
              });
              setTransactionType('expense');
              setShowForm(!showForm);
              setIsEditing(false);
            }}
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {showForm ? 'Cancel' : 'New Transaction'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Income
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <Minus className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Net Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(totalIncome - totalExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form for adding expenses */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Transaction' : 'Add New Transaction'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type</Label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={transactionType === 'expense' ? 'default' : 'outline'}
                      onClick={() => {
                        setTransactionType('expense');
                        setFormData(prev => ({...prev, category: ''}));
                      }}
                      className="flex-1"
                    >
                      <Minus className="mr-2 h-4 w-4" />
                      Expense
                    </Button>
                    <Button
                      type="button"
                      variant={transactionType === 'income' ? 'default' : 'outline'}
                      onClick={() => {
                        setTransactionType('income');
                        setFormData(prev => ({...prev, category: ''}));
                      }}
                      className="flex-1"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Income
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank">Bank/Account</Label>
                  <Select
                    value={formData.bank}
                    onValueChange={(value) => setFormData({ ...formData, bank: value as Bank })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    type="number"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value: string) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setFormData({
                      id: '',
                      bank: '' as Bank,
                      amount: '',
                      category: '',
                      description: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">{isEditing ? 'Update' : 'Add'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredExpenses}
            title="Transaction History"
            rowActions={rowActions}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => {}}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
      />
    </div>
  );
}