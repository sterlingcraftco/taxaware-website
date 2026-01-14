import jsPDF from "jspdf";
import { formatCurrencyPDF, CompleteTaxResult, TaxBreakdown } from "./taxCalculations";
import { toast } from "sonner";

interface PDFGeneratorOptions {
    filename?: string;
    notes?: string;
    save?: boolean;
}

export const generateTaxPDF = (result: CompleteTaxResult | null, options: PDFGeneratorOptions = {}) => {
    if (!result) return null;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const { notes, filename = `tax-calculation-${new Date().toISOString().split("T")[0]}.pdf`, save = true } = options;

    // Brand colors
    const primaryGreen = { r: 34, g: 139, b: 84 };
    const goldAccent = { r: 234, g: 179, b: 8 };
    const darkText = { r: 27, g: 51, b: 38 };

    // Helper for safe number formatting
    const safeFormat = (val: number | undefined) => formatCurrencyPDF(val ?? 0);

    // Calculate generic derived values if not present
    const grossIncome = result.grossIncome ?? result.totalIncome?.salary ?? 0;
    const totalTax = result.total;
    const deductions = result.deductions || {
        pension: 0,
        nhf: 0,
        rentRelief: 0,
        totalDeductions: 0,
        nhis: 0,
        lifeAssurance: 0,
        mortgageInterest: 0
    };
    const chargeableIncome = result.chargeableIncome ?? (grossIncome - deductions.totalDeductions);

    const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;
    const takeHome = grossIncome - totalTax - deductions.totalDeductions;

    // Note: takeHome in simple calculator logic was: gross - tax - pension - nhf. 
    // It didn't account for other deductions in the takeHome calc displayed in PDF usually (or maybe it did?).
    // Let's stick to gross - tax - totalDeductions for "Net Take Home" logic if we assume all deductions are from salary.
    // Actually, rent relief is a relief, not a deduction from salary (usually you paid rent separately).
    // But for "Net Take Home" usually means "Disposable Income".
    // SimpleCalculatorContent.tsx used: result.grossIncome - result.total - result.deductions.pension - result.deductions.nhf;
    // It ignored rent relief from take home calc because rent is an expense, relief is just tax reduction.
    // We should replicate that logic to be safe.
    // "Deductions from Salary" vs "Reliefs".
    // Pension, NHF, NHIS are usually deducted from source. 
    // Life Assurance, Mortgage, Rent are reliefs (though Life Assurance/Mortgage might be paid separately).
    // To match typical expectation: Take Home = Gross - Tax - (Pension + NHF + NHIS).
    const deductionsFromSource = (deductions.pension || 0) + (deductions.nhf || 0) + (deductions.nhis || 0);
    const calculatedTakeHome = grossIncome - totalTax - deductionsFromSource;

    // Header with green gradient
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(0, 0, pageWidth, 45, "F");

    // Gold accent line
    doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
    doc.rect(0, 45, pageWidth, 4, "F");

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Nigerian Tax Calculator", pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Tax Estimate Report", pageWidth / 2, 32, { align: "center" });

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-NG", { dateStyle: "long" })}`, pageWidth / 2, 40, { align: "center" });

    // Reset text color
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    // Income Section
    let yPos = 65;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Income Sources", 20, yPos);

    yPos += 12;
    doc.setFontSize(11);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    const incomeData: [string, string][] = [];
    if (result.totalIncome) {
        if (result.totalIncome.salary > 0) incomeData.push(["Employment Salary", safeFormat(result.totalIncome.salary)]);
        if (result.totalIncome.freelance > 0) incomeData.push(["Freelance Income", safeFormat(result.totalIncome.freelance)]);
        if (result.totalIncome.business > 0) incomeData.push(["Business Income", safeFormat(result.totalIncome.business)]);
        if (result.totalIncome.benefitsInKind > 0) incomeData.push(["Benefits in Kind", safeFormat(result.totalIncome.benefitsInKind)]);
    }
    // If no detailed income or just gross provided (Simple Calculator case)
    if (incomeData.length === 0) {
        // Just show Gross
    }

    // Add Gross Total at the end
    incomeData.push(["Gross Annual Income:", safeFormat(grossIncome)]);

    incomeData.forEach(([label, value], index) => {
        const isTotal = index === incomeData.length - 1;
        doc.setFont("helvetica", isTotal ? "bold" : "normal");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - 20, yPos, { align: "right" });
        yPos += 8;
    });

    // Deductions Section
    yPos += 6;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Deductions & Reliefs", 20, yPos);

    yPos += 12;
    doc.setFontSize(11);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    const deductionsData: [string, string][] = [];
    if (deductions.pension > 0) deductionsData.push(["Less: Pension Contribution:", `(${safeFormat(deductions.pension)})`]);
    if (deductions.nhf > 0) deductionsData.push(["Less: NHF Contribution:", `(${safeFormat(deductions.nhf)})`]);
    if (deductions.nhis > 0) deductionsData.push(["Less: NHIS Contribution:", `(${safeFormat(deductions.nhis)})`]);
    if (deductions.lifeAssurance > 0) deductionsData.push(["Less: Life Assurance:", `(${safeFormat(deductions.lifeAssurance)})`]);
    if (deductions.mortgageInterest > 0) deductionsData.push(["Less: Mortgage Interest:", `(${safeFormat(deductions.mortgageInterest)})`]);
    if (deductions.rentRelief > 0) deductionsData.push(["Less: Rent Relief (20% of rent, max 500k):", `(${safeFormat(deductions.rentRelief)})`]);

    deductionsData.push(["Total Deductions:", safeFormat(deductions.totalDeductions)]);
    deductionsData.push(["Chargeable Income:", safeFormat(chargeableIncome)]);

    deductionsData.forEach(([label, value]) => {
        const isTotal = label.includes("Total") || label.includes("Chargeable");
        doc.setFont("helvetica", isTotal ? "bold" : "normal");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - 20, yPos, { align: "right" });
        yPos += 8;
    });

    // Tax Results
    yPos += 6;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Tax Calculation", 20, yPos);

    yPos += 12;
    doc.setFontSize(11);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    const taxSummary = [
        ["Total Tax Liability:", safeFormat(totalTax)],
        ["Effective Tax Rate:", `${effectiveRate.toFixed(1)}%`],
        ["Net Take Home (after tax & statutory):", safeFormat(calculatedTakeHome)],
    ];

    if (result.monthlySavingsRecommended) {
        taxSummary.push(["Recommended Monthly Savings (+10%):", safeFormat(result.monthlySavingsRecommended)]);
    }

    taxSummary.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - 20, yPos, { align: "right" });
        yPos += 8;
    });

    // Tax breakdown section
    yPos += 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.text("Tax Band Breakdown", 20, yPos);

    yPos += 12;
    doc.setFontSize(10);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);

    // Table header
    doc.setFillColor(goldAccent.r, goldAccent.g, goldAccent.b);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Band", 25, yPos);
    doc.text("Rate", 80, yPos);
    doc.text("Taxable Amount", 105, yPos);
    doc.text("Tax", pageWidth - 25, yPos, { align: "right" });

    yPos += 10;
    doc.setFont("helvetica", "normal");

    // Ensure breakdown exists
    const breakdown: TaxBreakdown[] = result.breakdown || [];

    breakdown.forEach((row, index) => {
        if (index % 2 === 0) {
            doc.setFillColor(245, 250, 247);
            doc.rect(20, yPos - 5, pageWidth - 40, 8, "F");
        }
        doc.setTextColor(darkText.r, darkText.g, darkText.b);
        doc.text(row.band.replace("₦", "NGN "), 25, yPos);
        doc.text(`${row.rate}%`, 80, yPos);
        doc.text(safeFormat(row.taxableInBand), 105, yPos);
        doc.text(safeFormat(row.taxInBand), pageWidth - 25, yPos, { align: "right" });
        yPos += 8;
    });

    // Total row
    yPos += 5;
    doc.setFillColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Total Tax Liability", 25, yPos);
    doc.text(safeFormat(totalTax), pageWidth - 25, yPos, { align: "right" });

    // Notes
    if (notes) {
        yPos += 15;
        doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Notes", 20, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(darkText.r, darkText.g, darkText.b);
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 40);
        doc.text(splitNotes, 20, yPos);
        yPos += (splitNotes.length * 5);
    }

    // Disclaimer
    yPos += 20;
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
        "This is an estimate only. Actual tax may vary based on additional reliefs and allowances.",
        pageWidth / 2,
        yPos,
        { align: "center" }
    );
    doc.text(
        "Consult a tax professional for accurate calculations.",
        pageWidth / 2,
        yPos + 5,
        { align: "center" }
    );

    // Website branding
    yPos += 15;
    doc.setTextColor(primaryGreen.r, primaryGreen.g, primaryGreen.b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TaxAware Nigeria", pageWidth / 2, yPos, { align: "center" });

    if (save) {
        doc.save(filename);
        try {
            toast.success("PDF Downloaded!");
        } catch (e) {
            console.log("Toast not available");
        }
    }

    return doc;
};
