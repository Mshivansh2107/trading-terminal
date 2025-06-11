import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  beneficiariesAtom, 
  addBeneficiaryAtom, 
  updateBeneficiaryAtom, 
  deleteBeneficiaryAtom,
  salesAtom,
  purchasesAtom,
  banksAtom
} from '../store/data';
import { formatCurrency, formatDateTime } from '../lib/utils';
import DataTable from '../components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CustomSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { PlusCircle, Edit, Trash2, User, Phone, CreditCard, FileText, Eye } from 'lucide-react';
import { BeneficiaryEntry, RiskLevel, Bank } from '../types';
import { RiskLevelBadge } from '../components/ui/risk-level-badge';
import { FileUpload } from '../components/ui/file-upload';
import DateRangeFilter from '../components/date-range-filter';
import { filterByDateAtom } from '../store/filters';

const CRM = () => {
  const [beneficiaries] = useAtom(beneficiariesAtom);
  const [, addBeneficiary] = useAtom(addBeneficiaryAtom);
  const [, updateBeneficiary] = useAtom(updateBeneficiaryAtom);
  const [, deleteBeneficiary] = useAtom(deleteBeneficiaryAtom);
  const [sales] = useAtom(salesAtom);
  const [purchases] = useAtom(purchasesAtom);
  const [banks] = useAtom(banksAtom);
  const [filterByDate] = useAtom(filterByDateAtom);

  const [showForm, setShowForm] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<BeneficiaryEntry | null>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryEntry | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactNo: '',
    governmentId: '',
    riskLevel: 'low' as RiskLevel,
    assignedBank: '' as Bank | '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Auto-assign bank based on risk level
  const getDefaultBankForRiskLevel = (riskLevel: RiskLevel): Bank | '' => {
    const activeBanks = banks.filter(bank => bank.isActive);
    if (activeBanks.length === 0) return '';

    switch (riskLevel) {
      case 'low':
        return activeBanks.find(bank => bank.name.includes('HDFC'))?.name as Bank || activeBanks[0]?.name as Bank || '';
      case 'medium':
        return activeBanks.find(bank => bank.name.includes('INDUSIND'))?.name as Bank || activeBanks[0]?.name as Bank || '';
      case 'high':
        return activeBanks.find(bank => bank.name.includes('BOB'))?.name as Bank || activeBanks[0]?.name as Bank || '';
      case 'critical':
        return activeBanks.find(bank => bank.name.includes('PNB'))?.name as Bank || activeBanks[0]?.name as Bank || '';
      default:
        return activeBanks[0]?.name as Bank || '';
    }
  };

  // Handle risk level change
  const handleRiskLevelChange = (newRiskLevel: RiskLevel) => {
    setFormData(prev => ({
      ...prev,
      riskLevel: newRiskLevel,
      assignedBank: getDefaultBankForRiskLevel(newRiskLevel)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactNo: '',
      governmentId: '',
      riskLevel: 'low',
      assignedBank: getDefaultBankForRiskLevel('low'),
    });
    setUploadedFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contactNo) {
      alert('Please fill in all required fields');
      return;
    }

    // Simulate file upload (in real app, upload to storage service)
    const files = uploadedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      url: `#`, // Would be actual URL after upload
      type: file.type,
      size: file.size,
      uploadedAt: new Date(),
    }));

    const beneficiaryData: Omit<BeneficiaryEntry, 'id' | 'createdAt' | 'createdBy'> = {
      name: formData.name,
      contactNo: formData.contactNo,
      governmentId: formData.governmentId || undefined,
      riskLevel: formData.riskLevel,
      assignedBank: formData.assignedBank || undefined,
      files,
      updatedAt: editingBeneficiary ? new Date() : undefined,
      editedBy: editingBeneficiary ? 'current-user' : undefined,
    };

    if (editingBeneficiary) {
      updateBeneficiary({
        ...editingBeneficiary,
        ...beneficiaryData,
      });
    } else {
      addBeneficiary(beneficiaryData);
    }

    resetForm();
    setShowForm(false);
    setEditingBeneficiary(null);
  };

  const handleEdit = (beneficiary: BeneficiaryEntry) => {
    setEditingBeneficiary(beneficiary);
    setFormData({
      name: beneficiary.name,
      contactNo: beneficiary.contactNo,
      governmentId: beneficiary.governmentId || '',
      riskLevel: beneficiary.riskLevel,
      assignedBank: beneficiary.assignedBank || '',
    });
    setUploadedFiles([]); // Reset files for editing
    setShowForm(true);
  };

  const handleDelete = useCallback((beneficiary: BeneficiaryEntry) => {
    if (window.confirm(`Are you sure you want to delete ${beneficiary.name}?`)) {
      deleteBeneficiary(beneficiary.id);
    }
  }, [deleteBeneficiary]);

  const handleViewTransactions = (beneficiary: BeneficiaryEntry) => {
    setSelectedBeneficiary(beneficiary);
    setShowTransactions(true);
  };

  // Get transactions for selected beneficiary
  const beneficiaryTransactions = useMemo(() => {
    if (!selectedBeneficiary) return [];

    const beneficiarySales = sales
      .filter(sale => sale.beneficiaryId === selectedBeneficiary.id || sale.name === selectedBeneficiary.name)
      .map(sale => ({
        ...sale,
        type: 'sale' as const,
        amount: sale.totalPrice,
      }));

    const beneficiaryPurchases = purchases
      .filter(purchase => purchase.beneficiaryId === selectedBeneficiary.id || purchase.name === selectedBeneficiary.name)
      .map(purchase => ({
        ...purchase,
        type: 'purchase' as const,
        amount: purchase.totalPrice,
      }));

    return [...beneficiarySales, ...beneficiaryPurchases]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedBeneficiary, sales, purchases]);

  const columns = useMemo(() => [
    { 
      key: 'name', 
      label: 'Name',
      formatter: (value: string, row: BeneficiaryEntry) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    { 
      key: 'contactNo', 
      label: 'Contact',
      formatter: (value: string) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-500" />
          <span>{value}</span>
        </div>
      )
    },
    { 
      key: 'governmentId', 
      label: 'Government ID',
      formatter: (value: string) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-500" />
          <span>{value || '-'}</span>
        </div>
      )
    },
    { 
      key: 'riskLevel', 
      label: 'Risk Level',
      formatter: (value: RiskLevel) => <RiskLevelBadge level={value} />
    },
    { 
      key: 'assignedBank', 
      label: 'Assigned Bank',
      formatter: (value: Bank) => value || '-'
    },
    { 
      key: 'files', 
      label: 'Files',
      formatter: (value: any[]) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span>{value?.length || 0} files</span>
        </div>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Created At',
      formatter: (value: Date) => formatDateTime(new Date(value))
    },
  ], []);

  const rowActions = useMemo(() => [
    {
      label: 'View Transactions',
      icon: <Eye className="h-4 w-4" />,
      onClick: handleViewTransactions,
      variant: 'ghost' as const
    },
    {
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      variant: 'ghost' as const
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'ghost' as const
    }
  ], [handleEdit, handleDelete]);

  const transactionColumns = useMemo(() => [
    { 
      key: 'type', 
      label: 'Type',
      formatter: (value: string) => (
        <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${
          value === 'sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {value}
        </span>
      )
    },
    { key: 'orderNumber', label: 'Order #' },
    { key: 'bank', label: 'Bank' },
    { key: 'platform', label: 'Platform' },
    { 
      key: 'amount', 
      label: 'Amount',
      formatter: (value: number) => formatCurrency(value)
    },
    { 
      key: 'createdAt', 
      label: 'Date',
      formatter: (value: Date) => formatDateTime(new Date(value))
    },
  ], []);

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">CRM - Beneficiary Management</h1>
          <p className="text-gray-500">Manage beneficiaries and their transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter />
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
              setEditingBeneficiary(null);
            }}
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {showForm ? 'Cancel' : 'Add Beneficiary'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingBeneficiary ? 'Edit Beneficiary' : 'Add New Beneficiary'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contactNo">Contact Number *</Label>
                  <Input
                    id="contactNo"
                    value={formData.contactNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
                    placeholder="Enter contact number"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="governmentId">Government ID</Label>
                  <Input
                    id="governmentId"
                    value={formData.governmentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, governmentId: e.target.value }))}
                    placeholder="Enter government ID (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <CustomSelect
                    value={formData.riskLevel}
                    onValueChange={handleRiskLevelChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                      <SelectItem value="critical">Critical Risk</SelectItem>
                    </SelectContent>
                  </CustomSelect>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="assignedBank">Assigned Bank (Auto-assigned based on risk level)</Label>
                  <CustomSelect
                    value={formData.assignedBank}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assignedBank: value as Bank }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Assignment</SelectItem>
                      {banks.filter(bank => bank.isActive).map((bank) => (
                        <SelectItem key={bank.id} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </CustomSelect>
                </div>
              </div>

              <div>
                <Label>Upload Files (Max 3)</Label>
                <FileUpload
                  onFilesChange={setUploadedFiles}
                  maxFiles={3}
                  acceptedTypes={['image/*', '.pdf', '.doc', '.docx']}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingBeneficiary(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBeneficiary ? 'Update Beneficiary' : 'Add Beneficiary'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            data={beneficiaries}
            columns={columns}
            title="Beneficiaries"
            csvFilename="beneficiaries-data.csv"
            rowActions={rowActions}
          />
        </CardContent>
      </Card>

      {/* Transactions Dialog */}
      <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Transactions for {selectedBeneficiary?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <DataTable
              data={beneficiaryTransactions}
              columns={transactionColumns}
              title={`Transaction History (${beneficiaryTransactions.length} transactions)`}
              csvFilename={`${selectedBeneficiary?.name}-transactions.csv`}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTransactions(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRM;