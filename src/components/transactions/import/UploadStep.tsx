import { useState, useCallback, useRef } from 'react';
import { Upload, Building2, FileText, FileSpreadsheet, File, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ParsedTransaction, AccountInfo, ImportSource } from './types';
import { useStatementParser } from './useStatementParser';

interface UploadStepProps {
  onTransactionsParsed: (
    transactions: ParsedTransaction[],
    source: ImportSource,
    accountInfo: AccountInfo | null
  ) => void;
}

declare global {
  interface Window {
    MonoConnect: any;
  }
}

export function UploadStep({ onTransactionsParsed }: UploadStepProps) {
  const [uploading, setUploading] = useState(false);
  const [monoLoading, setMonoLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseFile } = useStatementParser();

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['csv', 'xlsx', 'xls', 'pdf'];

    if (!ext || !validExts.includes(ext)) {
      toast.error('Unsupported file type. Please upload a CSV, Excel, or PDF file.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    setUploading(true);
    try {
      const { transactions, accountInfo } = await parseFile(file);

      if (transactions.length === 0) {
        toast.error('No transactions found in the file. Please check the format.');
        return;
      }

      const sourceType = ext === 'csv' ? 'csv' : ext === 'pdf' ? 'pdf' : 'excel';
      onTransactionsParsed(transactions, { type: sourceType, fileName: file.name }, accountInfo);
      toast.success(`Found ${transactions.length} transactions`);
    } catch (err) {
      console.error('Parse error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  }, [parseFile, onTransactionsParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleMonoConnect = useCallback(() => {
    // Load Mono Connect widget script dynamically
    if (!window.MonoConnect) {
      const script = document.createElement('script');
      script.src = 'https://connect.mono.co/connect.js';
      script.onload = () => initMono();
      script.onerror = () => toast.error('Failed to load Mono Connect. Please try again.');
      document.head.appendChild(script);
    } else {
      initMono();
    }
  }, []);

  const initMono = useCallback(() => {
    setMonoLoading(true);

    const monoInstance = new window.MonoConnect({
      key: '', // Public key loaded from env at runtime isn't needed for widget — the edge function handles auth
      onSuccess: async ({ code }: { code: string }) => {
        try {
          // Exchange code for account ID via edge function
          const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke('mono-connect', {
            body: { action: 'exchange_token', code },
          });

          if (exchangeError) throw exchangeError;
          if (!exchangeData?.account_id) throw new Error('Failed to get account ID');

          // Fetch transactions
          const { data: txData, error: txError } = await supabase.functions.invoke('mono-connect', {
            body: {
              action: 'get_transactions',
              account_id: exchangeData.account_id,
            },
          });

          if (txError) throw txError;

          const transactions: ParsedTransaction[] = (txData.transactions || []).map((tx: any) => ({
            id: Math.random().toString(36).substring(2, 15),
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            balance: tx.balance,
            category_id: null,
            included: true,
            isDuplicate: false,
          }));

          onTransactionsParsed(
            transactions,
            { type: 'mono' },
            txData.account_info || null
          );
          toast.success(`Found ${transactions.length} transactions from your bank`);
        } catch (err) {
          console.error('Mono error:', err);
          toast.error('Failed to fetch bank transactions');
        } finally {
          setMonoLoading(false);
        }
      },
      onClose: () => {
        setMonoLoading(false);
      },
    });

    monoInstance.setup();
    monoInstance.open();
  }, [onTransactionsParsed]);

  return (
    <div className="space-y-6">
      {/* File Upload Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Parsing your statement...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Drop your bank statement here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse files
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> CSV
              </span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </span>
              <span className="flex items-center gap-1">
                <File className="w-3.5 h-3.5" /> PDF
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Mono Connect */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-medium">Connect Your Bank</h3>
              <p className="text-sm text-muted-foreground">
                Securely connect your bank account to import transactions automatically via Mono
              </p>
            </div>
            <Button
              onClick={handleMonoConnect}
              disabled={monoLoading}
              variant="outline"
              className="gap-2"
            >
              {monoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
              Connect Bank
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 text-sm">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-muted-foreground">
          <p className="font-medium mb-1">Tips for best results:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Download your statement in CSV format when possible — it's the most reliable</li>
            <li>Make sure the file includes columns for date, description, and amount</li>
            <li>PDF parsing uses AI and may require manual corrections</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
