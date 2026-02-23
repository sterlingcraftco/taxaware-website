import { useState } from 'react';
import PayslipGenerator from './PayslipGenerator';
import PayslipList from './PayslipList';
import { PayslipData } from '@/lib/payslipCalculations';

export default function PayslipDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [cloneData, setCloneData] = useState<Partial<PayslipData> | null>(null);

  return (
    <div className="space-y-6">
      <PayslipGenerator
        onSaved={() => setRefreshKey(k => k + 1)}
        cloneData={cloneData}
        onCloneConsumed={() => setCloneData(null)}
      />
      <PayslipList refreshKey={refreshKey} onClone={setCloneData} />
    </div>
  );
}

export { PayslipDashboard };
