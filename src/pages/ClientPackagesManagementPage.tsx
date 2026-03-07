import React from 'react';
import { ClientPackagesTable } from '@/components/admin/ClientPackagesTable';

export function ClientPackagesManagementPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-foreground">Client Packages</h1>
        <p className="text-muted-foreground mt-1">
          Assign and manage treatment packages for clients
        </p>
      </div>
      <ClientPackagesTable />
    </div>
  );
}
