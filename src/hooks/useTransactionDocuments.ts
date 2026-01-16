import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type TransactionDocument = Tables<'transaction_documents'>;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

export function useTransactionDocuments(transactionId: string | null) {
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!transactionId) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transaction_documents')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  const uploadDocument = async (file: File): Promise<TransactionDocument | null> => {
    if (!transactionId) {
      toast.error('No transaction selected');
      return null;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 10MB');
      return null;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed');
      return null;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const userId = userData.user.id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${transactionId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('transaction-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error: dbError } = await supabase
        .from('transaction_documents')
        .insert({
          transaction_id: transactionId,
          user_id: userId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setDocuments(prev => [data, ...prev]);
      toast.success('Document uploaded');
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (document: TransactionDocument) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('transaction-documents')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue anyway to clean up db record
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('transaction_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== document.id));
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('transaction-documents')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const downloadDocument = async (document: TransactionDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('transaction-documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  return {
    documents,
    loading,
    uploading,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    getPublicUrl,
    downloadDocument,
  };
}
