interface PaymentForReceipt {
  month: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  notes?: string;
}

interface ReceiptData {
  pgName: string;
  personName: string;
  roomNumber: string;
  blockName?: string;
  payments: PaymentForReceipt[];
  generatedDate: string;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Blob> {
  const jsPDF = (await import('jspdf')).default;
  const { applyPlugin } = await import('jspdf-autotable');
  applyPlugin(jsPDF);
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Clean solid header
  doc.setFillColor(41, 98, 217);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Simple border
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(0, 40, pageWidth, 40);

  // Clean title without shadow
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('RENT RECEIPT', pageWidth / 2, 24, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // PG Details with background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 50, pageWidth - 30, 45, 3, 3, 'F');
  doc.setDrawColor(59, 130, 246, 0.3);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, 50, pageWidth - 30, 45, 3, 3, 'S');

  doc.setFontSize(16);
  doc.setTextColor(41, 98, 217);
  doc.setFont(undefined, 'bold');
  doc.text('PG Manager', 25, 63);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont(undefined, 'normal');
  doc.text(data.pgName, 25, 72);

  // Receipt Info
  doc.setFontSize(9);
  doc.text('Generated: ' + data.generatedDate, pageWidth - 25, 63, { align: 'right' });
  doc.text('Total Payments: ' + data.payments.length, pageWidth - 25, 72, { align: 'right' });

  // Person Details
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.5);
  doc.line(25, 100, pageWidth - 25, 100);

  doc.setFontSize(12);
  doc.setTextColor(41, 98, 217);
  doc.setFont(undefined, 'bold');
  doc.text('Tenant Details', 25, 110);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont(undefined, 'normal');
  doc.text('Name: ' + data.personName, 25, 120);
  doc.text('Room: ' + data.roomNumber, 25, 128);
  if (data.blockName) {
    doc.text('Block: ' + data.blockName, 25, 136);
  }

  // Payment Summary Box
  const totalPaid = data.payments
    .filter((p: PaymentForReceipt) => p.status === 'paid')
    .reduce((sum: number, p: PaymentForReceipt) => sum + p.amount, 0);

  const paidCount = data.payments.filter((p: PaymentForReceipt) => p.status === 'paid').length;

  // Summary box with gradient
  const sumY = 145;
  for (let i = 0; i < 25; i++) {
    const ratio = i / 25;
    const r = Math.round(236 + (255 - 236) * ratio);
    const g = Math.round(242 + (255 - 242) * ratio);
    const b = Math.round(255 + (255 - 255) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(pageWidth - 115, sumY + i, 100, 1, 'F');
  }

  doc.setDrawColor(59, 130, 246, 0.3);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - 115, sumY, 100, 25, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Paid:', pageWidth - 105, sumY + 10);
  doc.text('Payments:', pageWidth - 105, sumY + 18);

  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.setFont(undefined, 'bold');
  doc.text('Rs. ' + totalPaid.toLocaleString(), pageWidth - 25, sumY + 10, { align: 'right' });
  doc.text(paidCount + ' paid', pageWidth - 25, sumY + 18, { align: 'right' });

  // Payment Table
  const tableData = data.payments.map((p: PaymentForReceipt) => [
    p.month,
    'Rs. ' + p.amount.toLocaleString(),
    p.paymentDate,
    p.paymentMethod.toUpperCase(),
    p.status.toUpperCase(),
    p.razorpayPaymentId || '-'
  ]);

  try {
    doc.autoTable({
      startY: 180,
      head: [['Month', 'Amount', 'Payment Date', 'Method', 'Status', 'Transaction ID']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 98, 217],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 28 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 42 },
      },
      margin: { left: 15, right: 15 }
    });
  } catch (e) {
    console.error('autoTable error:', e);
  }

  // Footer
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 250;
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.5);
  doc.line(25, finalY, pageWidth - 25, finalY);

  doc.setFillColor(248, 250, 252);
  doc.rect(0, finalY + 5, pageWidth, 20, 'F');

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated receipt. No signature required.', pageWidth / 2, finalY + 13, { align: 'center' });
  doc.text('For any queries, please contact your PG owner.', pageWidth / 2, finalY + 19, { align: 'center' });

  return doc.output('blob');
}

export function downloadReceipt(data: ReceiptData, filename: string = 'receipt.pdf'): void {
  generateReceiptPDF(data).then(blob => {
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }).catch(error => {
    console.error('Receipt download error:', error);
    alert('Failed to generate receipt. Please try again.');
  });
}
