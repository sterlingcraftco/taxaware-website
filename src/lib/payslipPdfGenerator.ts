import jsPDF from 'jspdf';
import { PayslipData, calculateGrossPay, calculateTotalDeductions, calculateNetPay, MONTH_NAMES } from './payslipCalculations';
import { formatCurrencyPDF } from './taxCalculations';
import { toast } from 'sonner';

export interface YTDTotals {
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  monthsCovered: number;
}

export type PayslipTheme = 'branded' | 'generic';

export const generatePayslipPDF = (data: PayslipData, save = true, ytd?: YTDTotals, theme: PayslipTheme = 'branded'): jsPDF => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const fmt = (v: number) => formatCurrencyPDF(v);

  const isBranded = theme === 'branded';
  const primary = isBranded ? { r: 34, g: 139, b: 84 } : { r: 51, g: 65, b: 85 };
  const accent = isBranded ? { r: 234, g: 179, b: 8 } : { r: 100, g: 116, b: 139 };
  const dark = isBranded ? { r: 27, g: 51, b: 38 } : { r: 30, g: 41, b: 59 };
  const rowBg = isBranded ? { r: 245, g: 250, b: 247 } : { r: 241, g: 245, b: 249 };

  // Header
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, pw, 35, 'F');
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(0, 35, pw, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName || 'Company Name', pw / 2, 16, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('PAYSLIP', pw / 2, 26, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`${MONTH_NAMES[data.payPeriodMonth - 1]} ${data.payPeriodYear}`, pw / 2, 32, { align: 'center' });

  // Employee Info
  let y = 48;
  doc.setTextColor(dark.r, dark.g, dark.b);
  doc.setFontSize(10);

  const infoLeft: [string, string][] = [
    ['Employee Name:', data.employeeName || '-'],
    ['Employee ID:', data.employeeId || '-'],
  ];
  const infoRight: [string, string][] = [
    ['Department:', data.department || '-'],
    ['Job Title:', data.jobTitle || '-'],
  ];

  infoLeft.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, 20, y + i * 7);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 65, y + i * 7);
  });
  infoRight.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, pw / 2 + 10, y + i * 7);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pw / 2 + 50, y + i * 7);
  });

  y += 22;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pw - 20, y);
  y += 8;

  // Earnings & Deductions side by side
  const colLeft = 20;
  const colRight = pw / 2 + 5;
  const colWidth = pw / 2 - 25;

  // Section headers
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(colLeft, y - 5, colWidth, 8, 'F');
  doc.rect(colRight, y - 5, colWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS', colLeft + 3, y);
  doc.text('DEDUCTIONS', colRight + 3, y);

  y += 8;
  doc.setTextColor(dark.r, dark.g, dark.b);
  doc.setFontSize(9);

  const earnings: [string, number][] = [
    ['Basic Salary', data.basicSalary],
    ['Housing Allowance', data.housingAllowance],
    ['Transport Allowance', data.transportAllowance],
    ['Utility Allowance', data.utilityAllowance],
    ['Meal Allowance', data.mealAllowance],
    ['Leave Allowance', data.leaveAllowance],
    ['Overtime', data.overtime],
    ['Other Allowances', data.otherAllowances],
  ].filter(([, v]) => (v as number) > 0) as [string, number][];

  const deductions: [string, number][] = [
    ['PAYE Tax', data.payeTax],
    ['Pension (Employee 8%)', data.pensionEmployee],
    ['NHF (2.5%)', data.nhf],
    ['NHIS (5%)', data.nhis],
    ['Loan Repayment', data.loanRepayment],
    ['Other Deductions', data.otherDeductions],
  ].filter(([, v]) => (v as number) > 0) as [string, number][];

  const maxRows = Math.max(earnings.length, deductions.length);

  for (let i = 0; i < maxRows; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(rowBg.r, rowBg.g, rowBg.b);
      doc.rect(colLeft, y - 4, colWidth, 7, 'F');
      doc.rect(colRight, y - 4, colWidth, 7, 'F');
    }
    if (i < earnings.length) {
      doc.setFont('helvetica', 'normal');
      doc.text(earnings[i][0], colLeft + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(earnings[i][1]), colLeft + colWidth - 3, y, { align: 'right' });
    }
    if (i < deductions.length) {
      doc.setFont('helvetica', 'normal');
      doc.text(deductions[i][0], colRight + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(deductions[i][1]), colRight + colWidth - 3, y, { align: 'right' });
    }
    y += 7;
  }

  // Employer pension info
  if (data.pensionEmployer > 0) {
    y += 3;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Employer Pension Contribution (10%): ${fmt(data.pensionEmployer)}`, colRight + 3, y);
    y += 5;
  }

  // Totals
  y += 5;
  const grossPay = calculateGrossPay(data);
  const totalDeductions = calculateTotalDeductions(data);
  const netPay = calculateNetPay(data);

  // Gross & Total Deductions row
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(colLeft, y - 5, colWidth, 9, 'F');
  doc.rect(colRight, y - 5, colWidth, 9, 'F');
  doc.setTextColor(isBranded ? dark.r : 255, isBranded ? dark.g : 255, isBranded ? dark.b : 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Pay', colLeft + 3, y);
  doc.text(fmt(grossPay), colLeft + colWidth - 3, y, { align: 'right' });
  doc.text('Total Deductions', colRight + 3, y);
  doc.text(fmt(totalDeductions), colRight + colWidth - 3, y, { align: 'right' });

  // Net Pay
  y += 15;
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(20, y - 6, pw - 40, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 25, y + 1);
  doc.text(fmt(netPay), pw - 25, y + 1, { align: 'right' });

  // Notes
  if (data.notes) {
    y += 20;
    doc.setTextColor(dark.r, dark.g, dark.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, y);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(data.notes, pw - 40);
    doc.text(split, 20, y + 6);
    y += 6 + split.length * 4;
  }

  // YTD Section (optional)
  if (ytd) {
    y += 15;
    doc.setFillColor(dark.r, dark.g, dark.b);
    doc.rect(20, y - 5, pw - 40, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`YEAR-TO-DATE (${data.taxYear}) — ${ytd.monthsCovered} month(s)`, 25, y);
    y += 10;

    doc.setTextColor(dark.r, dark.g, dark.b);
    doc.setFontSize(9);
    const ytdRows: [string, string][] = [
      ['YTD Gross Pay', fmt(ytd.grossPay)],
      ['YTD Total Deductions', fmt(ytd.totalDeductions)],
      ['YTD Net Pay', fmt(ytd.netPay)],
    ];
    ytdRows.forEach(([label, value], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(rowBg.r, rowBg.g, rowBg.b);
        doc.rect(20, y - 4, pw - 40, 7, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.text(label, 25, y);
      doc.setFont('helvetica', 'bold');
      doc.text(value, pw - 25, y, { align: 'right' });
      y += 7;
    });
  }

  // Disclaimer
  y = doc.internal.pageSize.getHeight() - 25;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (isBranded) {
    doc.text('This payslip was generated using TaxAware Nigeria. It is an estimate for personal record-keeping purposes only.', pw / 2, y, { align: 'center' });
  } else {
    doc.text('This payslip is an estimate for personal record-keeping purposes only.', pw / 2, y, { align: 'center' });
  }
  doc.text('It does not constitute an official employer document. Verify all figures with your employer or tax consultant.', pw / 2, y + 4, { align: 'center' });

  // Branding (only for branded theme)
  if (isBranded) {
    y += 10;
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Generated by TaxAware Nigeria', pw / 2, y, { align: 'center' });
  }

  if (save) {
    const filename = `payslip-${MONTH_NAMES[data.payPeriodMonth - 1].toLowerCase()}-${data.payPeriodYear}.pdf`;
    doc.save(filename);
    try { toast.success('Payslip PDF Downloaded!'); } catch { /* noop */ }
  }

  return doc;
};