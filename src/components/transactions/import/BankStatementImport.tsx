import { useState, useCallback } from 'react';
import { FileUp, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTransactions } from '@/hooks/useTransactions';
import { UploadStep } from './UploadStep';
import { ReviewStep } from './ReviewStep';
import { ConfirmStep } from './ConfirmStep';
import { useDuplicateDetection } from './useDuplicateDetection';
import type { ParsedTransaction, AccountInfo, ImportSource } from './types';

interface BankStatementImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'review' | 'confirm';

export function BankStatementImport({
  open,
  onOpenChange,
  onImportComplete,
}: BankStatementImportProps) {
  const { transactions: existingTransactions, categories } = useTransactions();
  const { detectDuplicates } = useDuplicateDetection(existingTransactions);

  const [step, setStep] = useState<Step>('upload');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [importSource, setImportSource] = useState<ImportSource>({ type: 'csv' });

  const handleTransactionsParsed = useCallback(
    (transactions: ParsedTransaction[], source: ImportSource, info: AccountInfo | null) => {
      const withDuplicates = detectDuplicates(transactions);
      setParsedTransactions(withDuplicates);
      setAccountInfo(info);
      setImportSource(source);
      setStep('review');
    },
    [detectDuplicates]
  );

  const handleComplete = useCallback(() => {
    onImportComplete();
    onOpenChange(false);
    // Reset state
    setStep('upload');
    setParsedTransactions([]);
    setAccountInfo(null);
  }, [onImportComplete, onOpenChange]);

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('upload');
      setParsedTransactions([]);
      setAccountInfo(null);
    }
    onOpenChange(newOpen);
  };

  const stepLabels: Record<Step, string> = {
    upload: 'Upload Statement',
    review: 'Review Transactions',
    confirm: 'Confirm Import',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Import Bank Statement — {stepLabels[step]}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['upload', 'review', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : i < ['upload', 'review', 'confirm'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {step === 'upload' && (
          <UploadStep onTransactionsParsed={handleTransactionsParsed} />
        )}

        {step === 'review' && (
          <ReviewStep
            transactions={parsedTransactions}
            accountInfo={accountInfo}
            source={importSource}
            categories={categories}
            onTransactionsChange={setParsedTransactions}
            onBack={() => setStep('upload')}
            onConfirm={() => setStep('confirm')}
          />
        )}

        {step === 'confirm' && (
          <ConfirmStep
            transactions={parsedTransactions}
            source={importSource}
            onBack={() => setStep('review')}
            onComplete={handleComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
