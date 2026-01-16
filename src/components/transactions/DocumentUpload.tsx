import { useRef, useEffect } from 'react';
import { Upload, File, Image, Trash2, Download, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTransactionDocuments, TransactionDocument } from '@/hooks/useTransactionDocuments';

interface DocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  transactionDescription?: string;
}

export function DocumentUpload({
  open,
  onOpenChange,
  transactionId,
  transactionDescription,
}: DocumentUploadProps) {
  const {
    documents,
    loading,
    uploading,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  } = useTransactionDocuments(transactionId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && transactionId) {
      fetchDocuments();
    }
  }, [open, transactionId, fetchDocuments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await uploadDocument(files[i]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const isImage = (mimeType: string | null) => mimeType?.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Documents
          </DialogTitle>
          {transactionDescription && (
            <p className="text-sm text-muted-foreground truncate">
              {transactionDescription}
            </p>
          )}
        </DialogHeader>

        {/* Upload Area */}
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Images (JPEG, PNG, GIF, WebP) or PDF up to 10MB
              </p>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Attached Documents ({documents.length})
            </h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents attached</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onDownload={downloadDocument}
                  onDelete={deleteDocument}
                  formatFileSize={formatFileSize}
                  getFileIcon={getFileIcon}
                  isImage={isImage}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DocumentItemProps {
  document: TransactionDocument;
  onDownload: (doc: TransactionDocument) => void;
  onDelete: (doc: TransactionDocument) => void;
  formatFileSize: (bytes: number | null) => string;
  getFileIcon: (mimeType: string | null) => React.ReactNode;
  isImage: (mimeType: string | null) => boolean;
}

function DocumentItem({
  document,
  onDownload,
  onDelete,
  formatFileSize,
  getFileIcon,
  isImage,
}: DocumentItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex-shrink-0 p-2 rounded bg-background">
        {getFileIcon(document.mime_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{document.file_name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(document.file_size)}</span>
          {isImage(document.mime_type) && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              Image
            </Badge>
          )}
          {document.mime_type === 'application/pdf' && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              PDF
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDownload(document)}
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(document)}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
