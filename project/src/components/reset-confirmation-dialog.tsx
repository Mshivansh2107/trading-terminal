import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { clearDataAtom } from '../store/data';
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
import { AlertTriangle } from 'lucide-react';

interface ResetConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ResetConfirmationDialog: React.FC<ResetConfirmationDialogProps> = ({ open, onOpenChange }) => {
  const [, clearData] = useAtom(clearDataAtom);
  const [confirmationText, setConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (confirmationText !== 'RESET') return;
    
    setIsResetting(true);
    try {
      await clearData();
      onOpenChange(false);
    } catch (error) {
      console.error('Error resetting data:', error);
    } finally {
      setIsResetting(false);
      setConfirmationText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Reset All Data
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete all sales entries, purchase entries, bank transfers, bank account balances, and stock balances. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <p className="text-sm text-gray-500">
              Type "RESET" in the box below to confirm:
            </p>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type RESET to confirm"
              className="font-mono"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={confirmationText !== 'RESET' || isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset All Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetConfirmationDialog; 