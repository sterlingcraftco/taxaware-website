import { useState } from 'react';
import PayslipGenerator from './PayslipGenerator';
import PayslipList from './PayslipList';
import { PayslipData } from '@/lib/payslipCalculations';

interface EditPayslipData {
  id: string;
  data: Partial<PayslipData>;
}

export default function PayslipDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [cloneData, setCloneData] = useState<Partial<PayslipData> | null>(null);
  const [editData, setEditData] = useState<EditPayslipData | null>(null);

  const handleSaved = () => {
    setRefreshKey(k => k + 1);
    setEditData(null);
  };

  return (
    <div className="space-y-6">
      <PayslipGenerator
        onSaved={handleSaved}
        cloneData={cloneData}
        onCloneConsumed={() => setCloneData(null)}
        editId={editData?.id ?? null}
        editData={editData?.data ?? null}
        onEditCleared={() => setEditData(null)}
      />
      <PayslipList
        refreshKey={refreshKey}
        onClone={setCloneData}
        onEdit={(id, data) => setEditData({ id, data })}
      />
    </div>
  );
}

export { PayslipDashboard };
