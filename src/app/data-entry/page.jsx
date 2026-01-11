'use client';

import PrivateRoute from '@/components/PrivateRoute';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/admin/Dashboard';

export default function DataEntryPage() {
  return (
    <PrivateRoute allowedRoles={['admin']}>
      <Layout>
        <Dashboard />
      </Layout>
    </PrivateRoute>
  );
}