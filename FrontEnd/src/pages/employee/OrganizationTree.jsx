import React from 'react';
import OrganizationChart from '../../components/common/OrganizationChart';

const OrganizationTree = () => {
  return (
    <div className="w-full max-w-7xl mx-auto p-2 pb-24 font-sans">
      <OrganizationChart readOnly={true} />
    </div>
  );
};

export default OrganizationTree;
