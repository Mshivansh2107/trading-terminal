import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { banksAtom, addBankAtom, updateBankAtom, deleteBankAtom } from '../store/data';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { BankEntity } from '../types';

type BankFormData = {
  name: string;
  description: string;
  isActive: boolean;
};

const BankManagement = () => {
  const [banks] = useAtom(banksAtom);
  const [, addBank] = useAtom(addBankAtom);
  const [, updateBank] = useAtom(updateBankAtom);
  const [, deleteBank] = useAtom(deleteBankAtom);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentBank, setCurrentBank] = useState<BankEntity | null>(null);
  const [formData, setFormData] = useState<BankFormData>({
    name: '',
    description: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
    });
  };
  
  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };
  
  const handleOpenEditDialog = (bank: BankEntity) => {
    setCurrentBank(bank);
    setFormData({
      name: bank.name,
      description: bank.description || '',
      isActive: bank.isActive,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (bank: BankEntity) => {
    setCurrentBank(bank);
    setIsDeleteDialogOpen(true);
  };
  
  const handleAddBank = async () => {
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      await addBank({
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
      });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add bank:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUpdateBank = async () => {
    if (!formData.name || !currentBank) return;
    
    setIsSubmitting(true);
    try {
      await updateBank({
        ...currentBank,
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update bank:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteBank = async () => {
    if (!currentBank) return;
    
    setIsSubmitting(true);
    try {
      await deleteBank(currentBank.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete bank:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bank Management</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleOpenAddDialog}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          Add Bank
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left font-medium text-gray-500">Name</th>
                <th className="py-2 px-4 text-left font-medium text-gray-500">Description</th>
                <th className="py-2 px-4 text-center font-medium text-gray-500">Status</th>
                <th className="py-2 px-4 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banks.map((bank) => (
                <tr key={bank.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{bank.name}</td>
                  <td className="py-3 px-4">{bank.description || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs ${
                      bank.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {bank.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenEditDialog(bank)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenDeleteDialog(bank)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {banks.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    No banks found. Add a bank to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      
      {/* Add Bank Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bank</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="Enter bank name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Enter bank description (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">Active</Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBank} disabled={!formData.name || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Bank'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Bank Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isActive" className="text-right">Active</Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateBank} disabled={!formData.name || isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Bank'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Bank Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bank</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this bank?</p>
            <p className="font-medium mt-2">{currentBank?.name}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteBank} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Bank'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BankManagement; 