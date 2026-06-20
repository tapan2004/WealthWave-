import React, { useState, useRef } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import api from '../services/api';

const PDFReportButton = () => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    try {
      setGenerating(true);

      // Fetch all data in parallel
      const [summaryRes, analyticsRes, budgetsRes, recentRes, chartRes, healthRes] = await Promise.all([
        api.get('/transactions/summary'),
        api.get('/transactions/analytics'),
        api.get('/budgets/check'),
        api.get('/transactions/recent'),
        api.get('/transactions/chart/monthly-expense'),
        api.get('/transactions/health-score'),
      ]);

      const summary = summaryRes.data;
      const analytics = analyticsRes.data;
      const budgets = budgetsRes.data;
      const recent = recentRes.data;
      const chart = chartRes.data;
      const health = healthRes.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Helper
      const addText = (text, x, size = 10, style = 'normal', color = [51, 65, 85]) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        doc.setTextColor(...color);
        doc.text(text, x, y);
      };

      const addLine = () => {
        doc.setDrawColor(226, 232, 240);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;
      };

      const checkPage = (neededSpace = 30) => {
        if (y > 270 - neededSpace) {
          doc.addPage();
          y = 20;
        }
      };

      // ===== HEADER =====
      doc.setFillColor(79, 70, 229); // indigo
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('FinTrack', 15, 25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Financial Report', 15, 35);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - 15, 35, { align: 'right' });
      y = 60;

      // ===== FINANCIAL HEALTH SCORE =====
      addText('Financial Health Score', 15, 16, 'bold', [15, 23, 42]);
      y += 10;
      const gradeColors = { Excellent: [16, 185, 129], Good: [59, 130, 246], Fair: [245, 158, 11], 'Needs Work': [249, 115, 22], Critical: [239, 68, 68] };
      const gc = gradeColors[health.grade] || [100, 100, 100];
      addText(`Score: ${health.score} / ${health.maxScore}`, 15, 22, 'bold', gc);
      y += 8;
      addText(`Grade: ${health.grade}`, 15, 12, 'normal', gc);
      y += 6;
      addText(`Savings Rate: ${health.savingsRate}%`, 15, 10);
      y += 12;
      addLine();

      // ===== SUMMARY =====
      addText('Financial Summary', 15, 16, 'bold', [15, 23, 42]);
      y += 10;

      // Income box
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(15, y - 5, 55, 22, 3, 3, 'F');
      addText('Income', 20, 9, 'normal', [5, 150, 105]);
      y += 6;
      addText(`₹${(summary.totalIncome || 0).toFixed(2)}`, 20, 14, 'bold', [5, 150, 105]);
      y -= 6;

      // Expense box
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(75, y - 5, 55, 22, 3, 3, 'F');
      addText('Expenses', 80, 9, 'normal', [220, 38, 38]);
      y += 6;
      addText(`₹${(summary.totalExpense || 0).toFixed(2)}`, 80, 14, 'bold', [220, 38, 38]);
      y -= 6;

      // Balance box
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(135, y - 5, 55, 22, 3, 3, 'F');
      addText('Balance', 140, 9, 'normal', [37, 99, 235]);
      y += 6;
      addText(`₹${(summary.balance || 0).toFixed(2)}`, 140, 14, 'bold', [37, 99, 235]);
      y += 16;
      addLine();

      // ===== MONTHLY EXPENSES CHART (BAR CHART) =====
      checkPage(70);
      addText('Monthly Expense Trend', 15, 16, 'bold', [15, 23, 42]);
      y += 10;

      if (chart.length > 0) {
        const maxVal = Math.max(...chart.map(c => c.total || 0));
        const barWidth = Math.min(20, (pageWidth - 40) / chart.length - 4);
        const chartHeight = 50;

        chart.forEach((c, i) => {
          const barHeight = maxVal > 0 ? ((c.total || 0) / maxVal) * chartHeight : 0;
          const x = 20 + i * (barWidth + 4);

          // Bar  
          doc.setFillColor(99, 102, 241);
          doc.roundedRect(x, y + chartHeight - barHeight, barWidth, barHeight, 1, 1, 'F');

          // Label
          doc.setFontSize(6);
          doc.setTextColor(100, 116, 139);
          doc.text(`M${c.month}`, x + barWidth / 2, y + chartHeight + 6, { align: 'center' });

          // Value on top
          doc.setFontSize(5);
          doc.text(`₹${(c.total || 0).toFixed(0)}`, x + barWidth / 2, y + chartHeight - barHeight - 2, { align: 'center' });
        });
        y += chartHeight + 15;
      } else {
        addText('No monthly data available', 15, 10, 'italic', [148, 163, 184]);
        y += 10;
      }
      addLine();

      // ===== BUDGET STATUS =====
      checkPage(40);
      addText('Budget Status', 15, 16, 'bold', [15, 23, 42]);
      y += 10;

      if (budgets.length === 0) {
        addText('No budgets configured.', 15, 10, 'italic', [148, 163, 184]);
        y += 10;
      } else {
        budgets.forEach(b => {
          checkPage(18);
          const pct = Math.min((b.spent / b.budget) * 100, 100);
          const exceeded = b.spent > b.budget;

          addText(b.category, 15, 10, 'bold');
          addText(`₹${b.spent.toFixed(2)} / ₹${b.budget.toFixed(2)}`, pageWidth - 15, 10, 'normal', exceeded ? [220, 38, 38] : [100, 116, 139]);
          doc.text(`₹${b.spent.toFixed(2)} / ₹${b.budget.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
          y += 5;

          // Progress bar
          doc.setFillColor(226, 232, 240);
          doc.roundedRect(15, y, pageWidth - 30, 4, 2, 2, 'F');
          doc.setFillColor(...(exceeded ? [220, 38, 38] : pct >= 80 ? [245, 158, 11] : [99, 102, 241]));
          doc.roundedRect(15, y, (pageWidth - 30) * (pct / 100), 4, 2, 2, 'F');
          y += 12;
        });
      }
      addLine();

      // ===== RECENT TRANSACTIONS =====
      checkPage(50);
      addText('Recent Transactions', 15, 16, 'bold', [15, 23, 42]);
      y += 10;

      // Table header
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 4, pageWidth - 30, 10, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Title', 18, y + 2);
      doc.text('Category', 90, y + 2);
      doc.text('Amount', pageWidth - 18, y + 2, { align: 'right' });
      y += 12;

      recent.forEach(t => {
        checkPage(12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(t.title || '', 18, y);
        doc.text(t.categoryName || 'General', 90, y);
        doc.setTextColor(...(t.type === 'INCOME' ? [5, 150, 105] : [220, 38, 38]));
        doc.text(`${t.type === 'INCOME' ? '+' : '-'}₹${Math.abs(t.amount).toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
        y += 8;
      });

      // ===== FOOTER =====
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`FinTrack Report • Page ${i} of ${pages}`, pageWidth / 2, 290, { align: 'center' });
      }

      doc.save('FinTrack-Report.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF report.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-50"
      title="Download PDF Report"
    >
      {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
      {generating ? 'Generating...' : 'PDF Report'}
    </button>
  );
};

export default PDFReportButton;