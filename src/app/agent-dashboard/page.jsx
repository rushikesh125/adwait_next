'use client';

import PrivateRoute from '@/components/PrivateRoute';
import Layout from '@/components/Layout';
import AgentDashboard from '@/pages/agent/AgentDashboard';

export default function AgentDashboardPage() {
  return (
    <PrivateRoute allowedRoles={['agent']}>
      <Layout>
        <AgentDashboard />
      </Layout>
    </PrivateRoute>
  );
}