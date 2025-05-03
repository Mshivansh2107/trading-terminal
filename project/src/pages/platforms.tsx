import React from 'react';
import PlatformManagement from '../components/platform-management';

const PlatformsPage = () => {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Management</h1>
        <p className="text-gray-500">Manage the platforms used in your transactions</p>
      </div>
      
      <PlatformManagement />
    </div>
  );
};

export default PlatformsPage; 