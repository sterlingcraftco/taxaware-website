import jsPDF from "jspdf";
import { toast } from "sonner";
import { Transaction } from "@/hooks/useTransactions";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { format } from "date-fns";

interface TransactionCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string | null;
  icon?: string | null;
  is_tax_deductible?: boolean | null;
}

interface ExportOptions {
  transactions: Transaction[];
  categories: TransactionCategory[];
  filters: TransactionFilters;
  getCategoryById: (id: string | null) => TransactionCategory | undefined;
}

const formatCurrency = (amount: number): string => {
  return `NGN ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCurrencyPlain = (amount: number): string => {
  return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getFilterDescription = (filters: TransactionFilters): string => {
  const parts: string[] = [];
  
  if (filters.dateFrom) {
    parts.push(`From: ${format(filters.dateFrom, 'dd MMM yyyy')}`);
  }
  if (filters.dateTo) {
    parts.push(`To: ${format(filters.dateTo, 'dd MMM yyyy')}`);
  }
  if (filters.type !== 'all') {
    parts.push(`Type: ${filters.type.charAt(0).toUpperCase() + filters.type.slice(1)}`);
  }
  if (filters.taxYear) {
    parts.push(`Tax Year: ${filters.taxYear}`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : 'All Transactions';
};

// CSV Export
export const exportTransactionsToCSV = (options: ExportOptions): void => {
  const { transactions, getCategoryById, filters } = options;
  
  if (transactions.length === 0) {
    toast.error('No transactions to export');
    return;
  }

  // CSV Headers
  const headers = [
    'Date',
    'Description',
    'Type',
    'Category',
    'Amount (NGN)',
    'Tax Year',
    'Status',
    'Notes'
  ];

  // CSV Rows
  const rows = transactions.map(t => {
    const category = getCategoryById(t.category_id);
    return [
      format(new Date(t.transaction_date), 'yyyy-MM-dd'),
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      category?.name || 'Uncategorized',
      t.type === 'income' ? t.amount : -t.amount,
      t.tax_year || '',
      t.status || 'completed',
      t.notes ? `"${t.notes.replace(/"/g, '""')}"` : ''
    ];
  });

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  // Add summary rows
  rows.push([]);
  rows.push(['Summary']);
  rows.push(['Total Income', '', '', '', totals.income]);
  rows.push(['Total Expenses', '', '', '', -totals.expense]);
  rows.push(['Net Balance', '', '', '', totals.income - totals.expense]);
  rows.push([]);
  rows.push(['Filters Applied', getFilterDescription(filters)]);
  rows.push(['Export Date', format(new Date(), 'yyyy-MM-dd HH:mm:ss')]);

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Exported ${transactions.length} transactions to CSV`);
};

// PDF Export
export const exportTransactionsToPDF = (options: ExportOptions): void => {
  const { transactions, getCategoryById, filters } = options;

  if (transactions.length === 0) {
    toast.error('No transactions to export');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Brand colors
  const primaryGreen = { r: 34, g: 139, b: 84 };
  const goldAccent = { r: 234, g: 179, b: 8 };
  const darkText = { r: 27, g: 51, b: 38 };

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  // Header
  doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
  doc.rect(0, 40, pageWidth, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Transaction Report", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("TaxAware Nigeria", pageWidth / 2, 28, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, pageWidth / 2, 36, { align: "center" });

  // Filters summary
  let yPos = 52;
  doc.setTextColor(darkText.r, darkText.g, darkText.b);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`Filters: ${getFilterDescription(filters)}`, 15, yPos);

  // Summary boxes
  yPos = 62;
  const boxWidth = (pageWidth - 45) / 3;
  const boxHeight = 22;
  
  // Income box
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(15, yPos, boxWidth, boxHeight, 3, 3, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Total Income", 15 + boxWidth / 2, yPos + 8, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totals.income), 15 + boxWidth / 2, yPos + 17, { align: "center" });

  // Expense box
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(22.5 + boxWidth, yPos, boxWidth, boxHeight, 3, 3, 'F');
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Total Expenses", 22.5 + boxWidth + boxWidth / 2, yPos + 8, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totals.expense), 22.5 + boxWidth + boxWidth / 2, yPos + 17, { align: "center" });

  // Net balance box
  const netBalance = totals.income - totals.expense;
  doc.setFillColor(netBalance >= 0 ? 220 : 254, netBalance >= 0 ? 252 : 226, netBalance >= 0 ? 231 : 226);
  doc.roundedRect(30 + boxWidth * 2, yPos, boxWidth, boxHeight, 3, 3, 'F');
  doc.setTextColor(netBalance >= 0 ? 22 : 153, netBalance >= 0 ? 101 : 27, netBalance >= 0 ? 52 : 27);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Net Balance", 30 + boxWidth * 2 + boxWidth / 2, yPos + 8, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(netBalance), 30 + boxWidth * 2 + boxWidth / 2, yPos + 17, { align: "center" });

  // Transactions table
  yPos = 92;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
  doc.text(`Transactions (${transactions.length})`, 15, yPos);

  yPos += 8;

  // Table header
  const colWidths = [25, 70, 35, 40];
  const tableStartX = 15;
  
  doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
  doc.rect(tableStartX, yPos, pageWidth - 30, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText.r, darkText.g, darkText.b);
  
  let xPos = tableStartX + 3;
  doc.text("Date", xPos, yPos + 5.5);
  xPos += colWidths[0];
  doc.text("Description", xPos, yPos + 5.5);
  xPos += colWidths[1];
  doc.text("Category", xPos, yPos + 5.5);
  xPos += colWidths[2];
  doc.text("Amount", tableStartX + pageWidth - 33, yPos + 5.5, { align: "right" });

  yPos += 10;
  
  // Table rows
  doc.setFont("helvetica", "normal");
  const maxRowsPerPage = 30;
  let rowCount = 0;

  transactions.forEach((t, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 25) {
      doc.addPage();
      yPos = 20;
      rowCount = 0;
      
      // Re-add table header on new page
      doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
      doc.rect(tableStartX, yPos, pageWidth - 30, 8, 'F');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkText.r, darkText.g, darkText.b);
      
      let xPos = tableStartX + 3;
      doc.text("Date", xPos, yPos + 5.5);
      xPos += colWidths[0];
      doc.text("Description", xPos, yPos + 5.5);
      xPos += colWidths[1];
      doc.text("Category", xPos, yPos + 5.5);
      xPos += colWidths[2];
      doc.text("Amount", tableStartX + pageWidth - 33, yPos + 5.5, { align: "right" });
      
      yPos += 10;
      doc.setFont("helvetica", "normal");
    }

    // Alternating row background
    if (rowCount % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableStartX, yPos - 4, pageWidth - 30, 7, 'F');
    }

    const category = getCategoryById(t.category_id);
    
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFontSize(8);
    
    xPos = tableStartX + 3;
    doc.text(format(new Date(t.transaction_date), 'dd/MM/yy'), xPos, yPos);
    xPos += colWidths[0];
    
    // Truncate description if too long
    const maxDescLength = 45;
    const description = t.description.length > maxDescLength 
      ? t.description.substring(0, maxDescLength - 3) + '...' 
      : t.description;
    doc.text(description, xPos, yPos);
    xPos += colWidths[1];
    
    doc.text(category?.name || 'Uncategorized', xPos, yPos);
    
    // Amount with color
    doc.setTextColor(t.type === 'income' ? 22 : 153, t.type === 'income' ? 101 : 27, t.type === 'income' ? 52 : 27);
    doc.setFont("helvetica", "bold");
    const amountText = `${t.type === 'income' ? '+' : '-'}NGN ${formatCurrencyPlain(t.amount)}`;
    doc.text(amountText, tableStartX + pageWidth - 33, yPos, { align: "right" });
    doc.setFont("helvetica", "normal");
    
    yPos += 7;
    rowCount++;
  });

  // Footer on last page
  const footerY = pageHeight - 10;
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Generated by TaxAware Nigeria - For personal financial tracking only",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Save
  doc.save(`transactions-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  toast.success(`Exported ${transactions.length} transactions to PDF`);
};
