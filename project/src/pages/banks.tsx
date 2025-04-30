import React from 'react';
import BankManagement from '../components/bank-management';

const BanksPage = () => {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bank Management</h1>
        <p className="text-gray-500">Manage the banks used in your transactions</p>
      </div>
      
      <BankManagement />
    </div>
  );
};

export default BanksPage; 