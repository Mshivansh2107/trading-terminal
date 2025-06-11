import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { supabase } from '../lib/supabase';
import { authStateAtom } from './supabaseAuth';
import { getDefaultStore } from 'jotai';
import { 
  SalesEntry, 
  PurchaseEntry, 
  TransferEntry, 
  BankTransferEntry,
  ExpenseEntry,
  BeneficiaryEntry,
  DashboardData, 
  StatsData, 
  BankEntity, 
  PlatformEntity,
  RiskLevel,
  Bank
} from '../types';
import { 
  calculateStockBalance, 
  calculateBankTotal, 
  calculatePlatformTotal, 
  calculateTransferTotal,
  formatDateByRangeAtom
} from '../lib/utils';
import { dateRangeAtom, isDateInRangeAtom, isSingleDaySelectionAtom } from './filters';
import { format, parseISO } from 'date-fns';

// Data version atom for triggering reactive updates
export const dataVersionAtom = atom(0);

// Base data atoms
export const salesAtom = atomWithStorage<SalesEntry[]>('sales', []);
export const purchasesAtom = atomWithStorage<PurchaseEntry[]>('purchases', []);
export const transfersAtom = atomWithStorage<TransferEntry[]>('transfers', []);
export const bankTransfersAtom = atomWithStorage<BankTransferEntry[]>('bankTransfers', []);
export const expensesAtom = atomWithStorage<ExpenseEntry[]>('expenses', []);
export const beneficiariesAtom = atomWithStorage<BeneficiaryEntry[]>('beneficiaries', []);
export const banksAtom = atom<BankEntity[]>([]);
export const platformsAtom = atom<PlatformEntity[]>([]);

// Settings atom
export const settingsAtom = atomWithStorage('settings', {
  requiredMargin: 3,
  currentUsdPrice: 0,
  salesPriceRange: 0,
  buyPriceUsdt: 0,
  lastUsdtPriceUpdate: null as number | null,
});

// Helper function to get current user info
const getCurrentUser = () => {
  const authState = getDefaultStore().get(authStateAtom);
  return authState.user;
};

// Helper function to get user email for created_by field
const getUserEmail = () => {
  const user = getCurrentUser();
  return user?.email || 'unknown';
};

// Beneficiary management atoms
export const addBeneficiaryAtom = atom(
  null,
  async (get, set, beneficiaryData: Omit<BeneficiaryEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const newBeneficiary: BeneficiaryEntry = {
        ...beneficiaryData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        createdBy: getUserEmail(),
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('beneficiaries')
        .insert({
          id: newBeneficiary.id,
          name: newBeneficiary.name,
          contact_no: newBeneficiary.contactNo,
          government_id: newBeneficiary.governmentId,
          risk_level: newBeneficiary.riskLevel,
          assigned_bank: newBeneficiary.assignedBank,
          files: newBeneficiary.files,
          created_by: newBeneficiary.createdBy,
          created_at: newBeneficiary.createdAt.toISOString(),
        });

      if (error) throw error;

      // Update local state
      const currentBeneficiaries = get(beneficiariesAtom);
      set(beneficiariesAtom, [...currentBeneficiaries, newBeneficiary]);
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error adding beneficiary:', error);
      throw error;
    }
  }
);

export const updateBeneficiaryAtom = atom(
  null,
  async (get, set, beneficiary: BeneficiaryEntry) => {
    try {
      const updatedBeneficiary = {
        ...beneficiary,
        updatedAt: new Date(),
        editedBy: getUserEmail(),
      };

      // Update in Supabase
      const { error } = await supabase
        .from('beneficiaries')
        .update({
          name: updatedBeneficiary.name,
          contact_no: updatedBeneficiary.contactNo,
          government_id: updatedBeneficiary.governmentId,
          risk_level: updatedBeneficiary.riskLevel,
          assigned_bank: updatedBeneficiary.assignedBank,
          files: updatedBeneficiary.files,
          edited_by: updatedBeneficiary.editedBy,
          updated_at: updatedBeneficiary.updatedAt.toISOString(),
        })
        .eq('id', beneficiary.id);

      if (error) throw error;

      // Update local state
      const currentBeneficiaries = get(beneficiariesAtom);
      set(beneficiariesAtom, currentBeneficiaries.map(b => 
        b.id === beneficiary.id ? updatedBeneficiary : b
      ));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      throw error;
    }
  }
);

export const deleteBeneficiaryAtom = atom(
  null,
  async (get, set, beneficiaryId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', beneficiaryId);

      if (error) throw error;

      // Update local state
      const currentBeneficiaries = get(beneficiariesAtom);
      set(beneficiariesAtom, currentBeneficiaries.filter(b => b.id !== beneficiaryId));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      throw error;
    }
  }
);

// Sales management atoms
export const addSaleAtom = atom(
  null,
  async (get, set, saleData: Omit<SalesEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const newSale: SalesEntry = {
        ...saleData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        createdBy: getUserEmail(),
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('sales')
        .insert({
          id: newSale.id,
          order_number: newSale.orderNumber,
          bank: newSale.bank,
          order_type: newSale.orderType,
          asset_type: newSale.assetType,
          fiat_type: newSale.fiatType,
          total_price: newSale.totalPrice,
          price: newSale.price,
          quantity: newSale.quantity,
          platform: newSale.platform,
          name: newSale.name,
          contact_no: newSale.contactNo,
          beneficiary_id: newSale.beneficiaryId,
          created_by: newSale.createdBy,
          created_at: newSale.createdAt.toISOString(),
        });

      if (error) throw error;

      // Update local state
      const currentSales = get(salesAtom);
      set(salesAtom, [...currentSales, newSale]);
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  }
);

export const updateSaleAtom = atom(
  null,
  async (get, set, sale: SalesEntry) => {
    try {
      const updatedSale = {
        ...sale,
        updatedAt: new Date(),
        editedBy: getUserEmail(),
      };

      // Update in Supabase
      const { error } = await supabase
        .from('sales')
        .update({
          order_number: updatedSale.orderNumber,
          bank: updatedSale.bank,
          order_type: updatedSale.orderType,
          asset_type: updatedSale.assetType,
          fiat_type: updatedSale.fiatType,
          total_price: updatedSale.totalPrice,
          price: updatedSale.price,
          quantity: updatedSale.quantity,
          platform: updatedSale.platform,
          name: updatedSale.name,
          contact_no: updatedSale.contactNo,
          beneficiary_id: updatedSale.beneficiaryId,
          edited_by: updatedSale.editedBy,
          updated_at: updatedSale.updatedAt.toISOString(),
        })
        .eq('id', sale.id);

      if (error) throw error;

      // Update local state
      const currentSales = get(salesAtom);
      set(salesAtom, currentSales.map(s => 
        s.id === sale.id ? updatedSale : s
      ));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  }
);

export const deleteSaleAtom = atom(
  null,
  async (get, set, saleId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;

      // Update local state
      const currentSales = get(salesAtom);
      set(salesAtom, currentSales.filter(s => s.id !== saleId));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  }
);

// Purchase management atoms
export const addPurchaseAtom = atom(
  null,
  async (get, set, purchaseData: Omit<PurchaseEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const newPurchase: PurchaseEntry = {
        ...purchaseData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        createdBy: getUserEmail(),
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('purchases')
        .insert({
          id: newPurchase.id,
          order_number: newPurchase.orderNumber,
          bank: newPurchase.bank,
          order_type: newPurchase.orderType,
          asset_type: newPurchase.assetType,
          fiat_type: newPurchase.fiatType,
          total_price: newPurchase.totalPrice,
          price: newPurchase.price,
          quantity: newPurchase.quantity,
          platform: newPurchase.platform,
          name: newPurchase.name,
          contact_no: newPurchase.contactNo,
          beneficiary_id: newPurchase.beneficiaryId,
          created_by: newPurchase.createdBy,
          created_at: newPurchase.createdAt.toISOString(),
        });

      if (error) throw error;

      // Update local state
      const currentPurchases = get(purchasesAtom);
      set(purchasesAtom, [...currentPurchases, newPurchase]);
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error adding purchase:', error);
      throw error;
    }
  }
);

export const updatePurchaseAtom = atom(
  null,
  async (get, set, purchase: PurchaseEntry) => {
    try {
      const updatedPurchase = {
        ...purchase,
        updatedAt: new Date(),
        editedBy: getUserEmail(),
      };

      // Update in Supabase
      const { error } = await supabase
        .from('purchases')
        .update({
          order_number: updatedPurchase.orderNumber,
          bank: updatedPurchase.bank,
          order_type: updatedPurchase.orderType,
          asset_type: updatedPurchase.assetType,
          fiat_type: updatedPurchase.fiatType,
          total_price: updatedPurchase.totalPrice,
          price: updatedPurchase.price,
          quantity: updatedPurchase.quantity,
          platform: updatedPurchase.platform,
          name: updatedPurchase.name,
          contact_no: updatedPurchase.contactNo,
          beneficiary_id: updatedPurchase.beneficiaryId,
          edited_by: updatedPurchase.editedBy,
          updated_at: updatedPurchase.updatedAt.toISOString(),
        })
        .eq('id', purchase.id);

      if (error) throw error;

      // Update local state
      const currentPurchases = get(purchasesAtom);
      set(purchasesAtom, currentPurchases.map(p => 
        p.id === purchase.id ? updatedPurchase : p
      ));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error updating purchase:', error);
      throw error;
    }
  }
);

export const deletePurchaseAtom = atom(
  null,
  async (get, set, purchaseId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;

      // Update local state
      const currentPurchases = get(purchasesAtom);
      set(purchasesAtom, currentPurchases.filter(p => p.id !== purchaseId));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error deleting purchase:', error);
      throw error;
    }
  }
);

// Transfer management atoms
export const addTransferAtom = atom(
  null,
  async (get, set, transferData: Omit<TransferEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const newTransfer: TransferEntry = {
        ...transferData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        createdBy: getUserEmail(),
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('transfers')
        .insert({
          id: newTransfer.id,
          from_platform: newTransfer.from,
          to_platform: newTransfer.to,
          quantity: newTransfer.quantity,
          created_by: newTransfer.createdBy,
          created_at: newTransfer.createdAt.toISOString(),
        });

      if (error) throw error;

      // Update local state
      const currentTransfers = get(transfersAtom);
      set(transfersAtom, [...currentTransfers, newTransfer]);
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error adding transfer:', error);
      throw error;
    }
  }
);

export const updateTransferAtom = atom(
  null,
  async (get, set, transfer: TransferEntry) => {
    try {
      const updatedTransfer = {
        ...transfer,
        updatedAt: new Date(),
        editedBy: getUserEmail(),
      };

      // Update in Supabase
      const { error } = await supabase
        .from('transfers')
        .update({
          from_platform: updatedTransfer.from,
          to_platform: updatedTransfer.to,
          quantity: updatedTransfer.quantity,
          edited_by: updatedTransfer.editedBy,
          updated_at: updatedTransfer.updatedAt.toISOString(),
        })
        .eq('id', transfer.id);

      if (error) throw error;

      // Update local state
      const currentTransfers = get(transfersAtom);
      set(transfersAtom, currentTransfers.map(t => 
        t.id === transfer.id ? updatedTransfer : t
      ));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error updating transfer:', error);
      throw error;
    }
  }
);

export const deleteTransferAtom = atom(
  null,
  async (get, set, transferId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('transfers')
        .delete()
        .eq('id', transferId);

      if (error) throw error;

      // Update local state
      const currentTransfers = get(transfersAtom);
      set(transfersAtom, currentTransfers.filter(t => t.id !== transferId));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error deleting transfer:', error);
      throw error;
    }
  }
);

// Bank Transfer management atoms
export const addBankTransferAtom = atom(
  null,
  async (get, set, bankTransferData: Omit<BankTransferEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const newBankTransfer: BankTransferEntry = {
        ...bankTransferData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        createdBy: getUserEmail(),
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('bank_transfers')
        .insert({
          id: newBankTransfer.id,
          from_bank: newBankTransfer.fromBank,
          from_account: newBankTransfer.fromAccount,
          to_bank: newBankTransfer.toBank,
          to_account: newBankTransfer.toAccount,
          amount: newBankTransfer.amount,
          reference: newBankTransfer.reference,
          created_by: newBankTransfer.createdBy,
          created_at: newBankTransfer.createdAt.toISOString(),
        });

      if (error) throw error;

      // Update local state
      const currentBankTransfers = get(bankTransfersAtom);
      set(bankTransfersAtom, [...currentBankTransfers, newBankTransfer]);
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error adding bank transfer:', error);
      throw error;
    }
  }
);

export const updateBankTransferAtom = atom(
  null,
  async (get, set, bankTransfer: BankTransferEntry) => {
    try {
      const updatedBankTransfer = {
        ...bankTransfer,
        updatedAt: new Date(),
        editedBy: getUserEmail(),
      };

      // Update in Supabase
      const { error } = await supabase
        .from('bank_transfers')
        .update({
          from_bank: updatedBankTransfer.fromBank,
          from_account: updatedBankTransfer.fromAccount,
          to_bank: updatedBankTransfer.toBank,
          to_account: updatedBankTransfer.toAccount,
          amount: updatedBankTransfer.amount,
          reference: updatedBankTransfer.reference,
          edited_by: updatedBankTransfer.editedBy,
          updated_at: updatedBankTransfer.updatedAt.toISOString(),
        })
        .eq('id', bankTransfer.id);

      if (error) throw error;

      // Update local state
      const currentBankTransfers = get(bankTransfersAtom);
      set(bankTransfersAtom, currentBankTransfers.map(bt => 
        bt.id === bankTransfer.id ? updatedBankTransfer : bt
      ));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error updating bank transfer:', error);
      throw error;
    }
  }
);

export const deleteBankTransferAtom = atom(
  null,
  async (get, set, bankTransferId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('bank_transfers')
        .delete()
        .eq('id', bankTransferId);

      if (error) throw error;

      // Update local state
      const currentBankTransfers = get(bankTransfersAtom);
      set(bankTransfersAtom, currentBankTransfers.filter(bt => bt.id !== bankTransferId));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error deleting bank transfer:', error);
      throw error;
    }
  }
);

// Expense management atoms
export const addExpenseAtom = atom(
  null,
  async (get, set, expenseData: Omit<ExpenseEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const newExpense: ExpenseEntry = {
        ...expenseData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        createdBy: getUserEmail(),
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('expenses')
        .insert({
          id: newExpense.id,
          bank: newExpense.bank,
          amount: newExpense.amount,
          type: newExpense.type,
          category: newExpense.category,
          description: newExpense.description,
          created_by: newExpense.createdBy,
          created_at: newExpense.createdAt.toISOString(),
        });

      if (error) throw error;

      // Update local state
      const currentExpenses = get(expensesAtom);
      set(expensesAtom, [...currentExpenses, newExpense]);
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  }
);

export const updateExpenseAtom = atom(
  null,
  async (get, set, expense: ExpenseEntry) => {
    try {
      const updatedExpense = {
        ...expense,
        updatedAt: new Date(),
        editedBy: getUserEmail(),
      };

      // Update in Supabase
      const { error } = await supabase
        .from('expenses')
        .update({
          bank: updatedExpense.bank,
          amount: updatedExpense.amount,
          type: updatedExpense.type,
          category: updatedExpense.category,
          description: updatedExpense.description,
          edited_by: updatedExpense.editedBy,
          updated_at: updatedExpense.updatedAt.toISOString(),
        })
        .eq('id', expense.id);

      if (error) throw error;

      // Update local state
      const currentExpenses = get(expensesAtom);
      set(expensesAtom, currentExpenses.map(e => 
        e.id === expense.id ? updatedExpense : e
      ));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }
);

export const deleteExpenseAtom = atom(
  null,
  async (get, set, expenseId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      // Update local state
      const currentExpenses = get(expensesAtom);
      set(expensesAtom, currentExpenses.filter(e => e.id !== expenseId));
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }
);

// Bank management atoms
export const fetchBanksAtom = atom(
  null,
  async (get, set) => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedBanks: BankEntity[] = data.map(bank => ({
          id: bank.id,
          name: bank.name,
          description: bank.description,
          isActive: bank.is_active,
          createdAt: new Date(bank.created_at),
          updatedAt: new Date(bank.updated_at || bank.created_at)
        }));
        set(banksAtom, formattedBanks);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  }
);

export const addBankAtom = atom(
  null,
  async (get, set, bankData: Omit<BankEntity, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .insert({
          name: bankData.name,
          description: bankData.description,
          is_active: bankData.isActive,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newBank: BankEntity = {
          id: data.id,
          name: data.name,
          description: data.description,
          isActive: data.is_active,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at || data.created_at)
        };

        const currentBanks = get(banksAtom);
        set(banksAtom, [...currentBanks, newBank]);
      }
    } catch (error) {
      console.error('Error adding bank:', error);
      throw error;
    }
  }
);

export const updateBankAtom = atom(
  null,
  async (get, set, bank: BankEntity) => {
    try {
      const { error } = await supabase
        .from('banks')
        .update({
          name: bank.name,
          description: bank.description,
          is_active: bank.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bank.id);

      if (error) throw error;

      const currentBanks = get(banksAtom);
      set(banksAtom, currentBanks.map(b => 
        b.id === bank.id ? { ...bank, updatedAt: new Date() } : b
      ));
    } catch (error) {
      console.error('Error updating bank:', error);
      throw error;
    }
  }
);

export const deleteBankAtom = atom(
  null,
  async (get, set, bankId: string) => {
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', bankId);

      if (error) throw error;

      const currentBanks = get(banksAtom);
      set(banksAtom, currentBanks.filter(b => b.id !== bankId));
    } catch (error) {
      console.error('Error deleting bank:', error);
      throw error;
    }
  }
);

// Platform management atoms
export const fetchPlatformsAtom = atom(
  null,
  async (get, set) => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedPlatforms: PlatformEntity[] = data.map(platform => ({
          id: platform.id,
          name: platform.name,
          description: platform.description,
          isActive: platform.is_active,
          createdAt: new Date(platform.created_at),
          updatedAt: new Date(platform.updated_at || platform.created_at)
        }));
        set(platformsAtom, formattedPlatforms);
      }
    } catch (error) {
      console.error('Error fetching platforms:', error);
    }
  }
);

export const addPlatformAtom = atom(
  null,
  async (get, set, platformData: Omit<PlatformEntity, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .insert({
          name: platformData.name,
          description: platformData.description,
          is_active: platformData.isActive,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newPlatform: PlatformEntity = {
          id: data.id,
          name: data.name,
          description: data.description,
          isActive: data.is_active,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at || data.created_at)
        };

        const currentPlatforms = get(platformsAtom);
        set(platformsAtom, [...currentPlatforms, newPlatform]);
      }
    } catch (error) {
      console.error('Error adding platform:', error);
      throw error;
    }
  }
);

export const updatePlatformAtom = atom(
  null,
  async (get, set, platform: PlatformEntity) => {
    try {
      const { error } = await supabase
        .from('platforms')
        .update({
          name: platform.name,
          description: platform.description,
          is_active: platform.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', platform.id);

      if (error) throw error;

      const currentPlatforms = get(platformsAtom);
      set(platformsAtom, currentPlatforms.map(p => 
        p.id === platform.id ? { ...platform, updatedAt: new Date() } : p
      ));
    } catch (error) {
      console.error('Error updating platform:', error);
      throw error;
    }
  }
);

export const deletePlatformAtom = atom(
  null,
  async (get, set, platformId: string) => {
    try {
      const { error } = await supabase
        .from('platforms')
        .delete()
        .eq('id', platformId);

      if (error) throw error;

      const currentPlatforms = get(platformsAtom);
      set(platformsAtom, currentPlatforms.filter(p => p.id !== platformId));
    } catch (error) {
      console.error('Error deleting platform:', error);
      throw error;
    }
  }
);

// Data refresh atom
export const refreshDataAtom = atom(
  null,
  async (get, set) => {
    try {
      console.log('Refreshing all data from Supabase...');
      
      // Fetch all data in parallel
      const [
        salesResponse,
        purchasesResponse,
        transfersResponse,
        bankTransfersResponse,
        expensesResponse,
        beneficiariesResponse
      ] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('bank_transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
        supabase.from('beneficiaries').select('*').order('created_at', { ascending: false })
      ]);

      // Process sales
      if (salesResponse.data) {
        const formattedSales: SalesEntry[] = salesResponse.data.map(sale => ({
          id: sale.id,
          orderNumber: sale.order_number,
          bank: sale.bank,
          orderType: sale.order_type,
          assetType: sale.asset_type,
          fiatType: sale.fiat_type,
          totalPrice: sale.total_price,
          price: sale.price,
          quantity: sale.quantity,
          platform: sale.platform,
          name: sale.name,
          contactNo: sale.contact_no,
          beneficiaryId: sale.beneficiary_id,
          createdAt: new Date(sale.created_at),
          updatedAt: sale.updated_at ? new Date(sale.updated_at) : undefined,
          editedBy: sale.edited_by,
          createdBy: sale.created_by || 'Unknown',
        }));
        set(salesAtom, formattedSales);
      }

      // Process purchases
      if (purchasesResponse.data) {
        const formattedPurchases: PurchaseEntry[] = purchasesResponse.data.map(purchase => ({
          id: purchase.id,
          orderNumber: purchase.order_number,
          bank: purchase.bank,
          orderType: purchase.order_type,
          assetType: purchase.asset_type,
          fiatType: purchase.fiat_type,
          totalPrice: purchase.total_price,
          price: purchase.price,
          quantity: purchase.quantity,
          platform: purchase.platform,
          name: purchase.name,
          contactNo: purchase.contact_no,
          beneficiaryId: purchase.beneficiary_id,
          createdAt: new Date(purchase.created_at),
          updatedAt: purchase.updated_at ? new Date(purchase.updated_at) : undefined,
          editedBy: purchase.edited_by,
          createdBy: purchase.created_by || 'Unknown',
        }));
        set(purchasesAtom, formattedPurchases);
      }

      // Process transfers
      if (transfersResponse.data) {
        const formattedTransfers: TransferEntry[] = transfersResponse.data.map(transfer => ({
          id: transfer.id,
          from: transfer.from_platform,
          to: transfer.to_platform,
          quantity: transfer.quantity,
          createdAt: new Date(transfer.created_at),
          updatedAt: transfer.updated_at ? new Date(transfer.updated_at) : undefined,
          editedBy: transfer.edited_by,
          createdBy: transfer.created_by || 'Unknown',
        }));
        set(transfersAtom, formattedTransfers);
      }

      // Process bank transfers
      if (bankTransfersResponse.data) {
        const formattedBankTransfers: BankTransferEntry[] = bankTransfersResponse.data.map(transfer => ({
          id: transfer.id,
          fromBank: transfer.from_bank,
          fromAccount: transfer.from_account,
          toBank: transfer.to_bank,
          toAccount: transfer.to_account,
          amount: transfer.amount,
          reference: transfer.reference,
          createdAt: new Date(transfer.created_at),
          updatedAt: transfer.updated_at ? new Date(transfer.updated_at) : undefined,
          editedBy: transfer.edited_by,
          createdBy: transfer.created_by || 'Unknown',
        }));
        set(bankTransfersAtom, formattedBankTransfers);
      }

      // Process expenses
      if (expensesResponse.data) {
        const formattedExpenses: ExpenseEntry[] = expensesResponse.data.map(expense => ({
          id: expense.id,
          bank: expense.bank,
          amount: expense.amount,
          type: expense.type,
          category: expense.category,
          description: expense.description,
          createdAt: new Date(expense.created_at),
          updatedAt: expense.updated_at ? new Date(expense.updated_at) : undefined,
          editedBy: expense.edited_by,
          createdBy: expense.created_by || 'Unknown',
        }));
        set(expensesAtom, formattedExpenses);
      }

      // Process beneficiaries
      if (beneficiariesResponse.data) {
        const formattedBeneficiaries: BeneficiaryEntry[] = beneficiariesResponse.data.map(beneficiary => ({
          id: beneficiary.id,
          name: beneficiary.name,
          contactNo: beneficiary.contact_no,
          governmentId: beneficiary.government_id,
          riskLevel: beneficiary.risk_level,
          assignedBank: beneficiary.assigned_bank,
          files: beneficiary.files || [],
          createdAt: new Date(beneficiary.created_at),
          updatedAt: beneficiary.updated_at ? new Date(beneficiary.updated_at) : undefined,
          editedBy: beneficiary.edited_by,
          createdBy: beneficiary.created_by || 'Unknown',
        }));
        set(beneficiariesAtom, formattedBeneficiaries);
      }

      // Fetch banks and platforms
      await Promise.all([
        get(fetchBanksAtom),
        get(fetchPlatformsAtom)
      ]);

      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
      
      console.log('Data refresh completed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  }
);

// Settings management atoms
export const syncSettingsAtom = atom(
  null,
  async (get, set) => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'trading_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        set(settingsAtom, data.value);
      }
    } catch (error) {
      console.error('Error syncing settings:', error);
    }
  }
);

export const updateSettingsAtom = atom(
  null,
  async (get, set, newSettings: Partial<typeof settingsAtom>) => {
    try {
      const currentSettings = get(settingsAtom);
      const updatedSettings = { ...currentSettings, ...newSettings };

      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'trading_settings',
          value: updatedSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      set(settingsAtom, updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
);

// Auto-fetch USD price atom
export const autoFetchUsdPriceAtom = atom(
  null,
  async (get, set) => {
    try {
      const { getUsdtPrice } = await import('../lib/usdtPrice');
      const price = await getUsdtPrice();
      
      if (price > 0) {
        const currentSettings = get(settingsAtom);
        const updatedSettings = {
          ...currentSettings,
          currentUsdPrice: price,
          lastUsdtPriceUpdate: Date.now(),
        };
        
        set(settingsAtom, updatedSettings);
        
        // Also update in Supabase
        await get(updateSettingsAtom)(updatedSettings);
      }
    } catch (error) {
      console.error('Error auto-fetching USD price:', error);
    }
  }
);

// Clear all data atom
export const clearDataAtom = atom(
  null,
  async (get, set) => {
    try {
      // Clear from Supabase
      await Promise.all([
        supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('bank_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('beneficiaries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      // Clear local state
      set(salesAtom, []);
      set(purchasesAtom, []);
      set(transfersAtom, []);
      set(bankTransfersAtom, []);
      set(expensesAtom, []);
      set(beneficiariesAtom, []);
      
      // Increment data version to trigger reactive updates
      set(dataVersionAtom, get(dataVersionAtom) + 1);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
);

// Dashboard data atom (computed)
export const dashboardDataAtom = atom<DashboardData>((get) => {
  const sales = get(salesAtom);
  const purchases = get(purchasesAtom);
  const transfers = get(transfersAtom);
  const bankTransfers = get(bankTransfersAtom);
  const expenses = get(expensesAtom);
  const settings = get(settingsAtom);
  const banks = get(banksAtom);
  const platforms = get(platformsAtom);
  const isInRange = get(isDateInRangeAtom);

  // Filter data by date range
  const filteredSales = sales.filter(sale => isInRange(sale.createdAt));
  const filteredPurchases = purchases.filter(purchase => isInRange(purchase.createdAt));
  const filteredTransfers = transfers.filter(transfer => isInRange(transfer.createdAt));
  const filteredBankTransfers = bankTransfers.filter(transfer => isInRange(transfer.createdAt));
  const filteredExpenses = expenses.filter(expense => isInRange(expense.createdAt));

  // Calculate totals
  const netSales = filteredSales.reduce((total, sale) => total + sale.totalPrice, 0);
  const netPurchases = filteredPurchases.reduce((total, purchase) => total + purchase.totalPrice, 0);
  const netExpenses = filteredExpenses.filter(e => e.type === 'expense').reduce((total, expense) => total + expense.amount, 0);
  const netIncomes = filteredExpenses.filter(e => e.type === 'income').reduce((total, income) => total + income.amount, 0);

  // Calculate stock balances for each platform
  const stockList = platforms.filter(p => p.isActive).map(platform => ({
    platform: platform.name as any,
    quantity: calculateStockBalance(purchases, sales, transfers, platform.name as any)
  }));

  // Calculate cash balances for each bank
  const cashList = banks.filter(b => b.isActive).map(bank => {
    const salesTotal = calculateBankTotal(filteredSales, bank.name);
    const purchasesTotal = calculateBankTotal(filteredPurchases, bank.name);
    const expensesTotal = filteredExpenses
      .filter(e => e.bank === bank.name)
      .reduce((sum, e) => sum + (e.type === 'expense' ? e.amount : -e.amount), 0);
    
    const transfersIn = filteredBankTransfers
      .filter(t => t.toBank === bank.name && t.fromBank !== 'ADJUSTMENT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const transfersOut = filteredBankTransfers
      .filter(t => t.fromBank === bank.name && t.toBank !== 'ADJUSTMENT')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const adjustmentIn = filteredBankTransfers
      .filter(t => t.fromBank === 'ADJUSTMENT' && t.toBank === bank.name)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const adjustmentOut = filteredBankTransfers
      .filter(t => t.fromBank === bank.name && t.toBank === 'ADJUSTMENT')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      bank: bank.name as any,
      amount: salesTotal - purchasesTotal - expensesTotal + transfersIn - transfersOut + adjustmentIn - adjustmentOut
    };
  });

  // Calculate other metrics
  const totalCash = cashList.reduce((sum, item) => sum + item.amount, 0);
  const currentMargin = netPurchases > 0 ? ((netSales - netPurchases) / netPurchases) * 100 : 0;
  const totalStockBalances = stockList.reduce((sum, item) => sum + item.quantity, 0);

  // Sales by bank
  const salesByBank = banks.filter(b => b.isActive).map(bank => ({
    bank: bank.name,
    total: calculateBankTotal(filteredSales, bank.name)
  }));

  return {
    salesPriceRange: settings.salesPriceRange,
    totalCash,
    totalCashAlt: totalCash,
    buyPriceRange: settings.buyPriceUsdt > 0 && settings.currentUsdPrice > 0 
      ? ((settings.buyPriceUsdt - settings.currentUsdPrice) / settings.currentUsdPrice) * 100 
      : 0,
    buyPriceRangeAlt: 0,
    stockList,
    cashList,
    netSales,
    netPurchases,
    netExpenses,
    netIncomes,
    currentMargin,
    requiredMargin: settings.requiredMargin,
    netCash: totalCash,
    netCashAfterSales: totalCash + netSales,
    totalBankBalances: totalCash,
    totalStockBalances,
    salesByBank,
  };
});

// Stats data atom (computed)
export const statsDataAtom = atom<StatsData>((get) => {
  const sales = get(salesAtom);
  const purchases = get(purchasesAtom);
  const expenses = get(expensesAtom);
  const banks = get(banksAtom);
  const platforms = get(platformsAtom);
  const isInRange = get(isDateInRangeAtom);
  const isSingleDay = get(isSingleDaySelectionAtom);
  const formatDateByRange = get(formatDateByRangeAtom);

  // Filter data by date range
  const filteredSales = sales.filter(sale => isInRange(sale.createdAt));
  const filteredPurchases = purchases.filter(purchase => isInRange(purchase.createdAt));
  const filteredExpenses = expenses.filter(expense => isInRange(expense.createdAt));

  // Group by date or hour based on selection
  const groupByTimeUnit = (items: any[]) => {
    const groups = new Map();
    
    items.forEach(item => {
      const date = new Date(item.createdAt);
      let key: string;
      let isoKey: string;
      
      if (isSingleDay) {
        // Group by hour for single day
        key = format(date, 'h:mm a');
        isoKey = format(date, 'HH:mm');
      } else {
        // Group by date for multiple days
        key = format(date, 'MMM d');
        isoKey = format(date, 'yyyy-MM-dd');
      }
      
      if (!groups.has(key)) {
        groups.set(key, { date: key, isoDate: isoKey, amount: 0 });
      }
      
      groups.get(key).amount += item.totalPrice || item.amount;
    });
    
    return Array.from(groups.values()).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  };

  // Generate time series data
  const salesByDay = groupByTimeUnit(filteredSales);
  const purchasesByDay = groupByTimeUnit(filteredPurchases);
  const expensesByDay = groupByTimeUnit(filteredExpenses.filter(e => e.type === 'expense'));
  const incomesByDay = groupByTimeUnit(filteredExpenses.filter(e => e.type === 'income'));

  // Group by bank
  const salesByBank = banks.filter(b => b.isActive).map(bank => ({
    bank: bank.name as any,
    amount: calculateBankTotal(filteredSales, bank.name)
  }));

  const purchasesByBank = banks.filter(b => b.isActive).map(bank => ({
    bank: bank.name as any,
    amount: calculateBankTotal(filteredPurchases, bank.name)
  }));

  const expensesByBank = banks.filter(b => b.isActive).map(bank => ({
    bank: bank.name as any,
    amount: filteredExpenses
      .filter(e => e.bank === bank.name && e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0)
  }));

  const incomesByBank = banks.filter(b => b.isActive).map(bank => ({
    bank: bank.name as any,
    amount: filteredExpenses
      .filter(e => e.bank === bank.name && e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0)
  }));

  // Group by platform
  const salesByPlatform = platforms.filter(p => p.isActive).map(platform => ({
    platform: platform.name as any,
    amount: calculatePlatformTotal(filteredSales, platform.name, 'totalPrice')
  }));

  const purchasesByPlatform = platforms.filter(p => p.isActive).map(platform => ({
    platform: platform.name as any,
    amount: calculatePlatformTotal(filteredPurchases, platform.name, 'totalPrice')
  }));

  // Cash distribution (same as dashboard)
  const cashDistribution = banks.filter(b => b.isActive).map(bank => ({
    bank: bank.name as any,
    amount: calculateBankTotal(filteredSales, bank.name) - calculateBankTotal(filteredPurchases, bank.name)
  }));

  // Calculate daily profit margins
  const dailyProfitMargins = salesByDay.map((saleDay, index) => {
    const purchaseDay = purchasesByDay[index];
    const salesAmount = saleDay.amount;
    const purchasesAmount = purchaseDay?.amount || 0;
    const margin = purchasesAmount > 0 ? ((salesAmount - purchasesAmount) / purchasesAmount) * 100 : 0;
    
    return {
      date: saleDay.date,
      isoDate: saleDay.isoDate,
      margin: parseFloat(margin.toFixed(2))
    };
  });

  // Calculate daily NPM values (placeholder - would need proper NPM calculation)
  const dailyNpmValues = salesByDay.map(saleDay => ({
    date: saleDay.date,
    isoDate: saleDay.isoDate,
    npmValue: 0 // Placeholder
  }));

  return {
    salesByDay,
    purchasesByDay,
    expensesByDay,
    incomesByDay,
    salesByBank,
    salesByPlatform,
    purchasesByBank,
    purchasesByPlatform,
    expensesByBank,
    incomesByBank,
    cashDistribution,
    dailyProfitMargins,
    dailyNpmValues,
    dailyNpm: 0, // Placeholder
  };
});