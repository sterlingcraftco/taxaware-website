import { useState } from 'react';
import PayslipGenerator from './PayslipGenerator';
import PayslipList from './PayslipList';

export default function PayslipDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <PayslipGenerator onSaved={() => setRefreshKey(k => k + 1)} />
      <PayslipList refreshKey={refreshKey} />
    </div>
  );
}

export { PayslipDashboard };
