import { getPersons } from '@/actions/person.actions';
import { getPaymentsByPerson } from '@/actions/payment.actions';
import { getBlocks } from '@/actions/block.actions';
import { getCurrentPG } from '@/actions/pg.actions';
import { getExpenses } from '@/actions/expense.actions';

interface ReportHeader {
  pgName: string;
  reportTitle: string;
  generatedDate: string;
  period?: string;
}

function addModernHeader(doc: any, header: ReportHeader) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Clean solid header background
  doc.setFillColor(41, 98, 217);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Simple thin border at bottom
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(0, 45, pageWidth, 45);

  // Clean title without shadow/3D effect
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text(header.reportTitle, pageWidth / 2, 22, { align: 'center' });

  if (header.period) {
    doc.setFontSize(11);
    doc.setTextColor(200, 220, 255);
    doc.setFont(undefined, 'normal');
    doc.text(header.period, pageWidth / 2, 32, { align: 'center' });
  }

  // PG Name tag
  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(15, 50, 130, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(header.pgName, 80, 57, { align: 'center' });

  // Date tag
  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(pageWidth - 145, 50, 130, 11, 2, 2, 'F');
  doc.text('Generated: ' + header.generatedDate, pageWidth - 80, 57, { align: 'center' });
}

function addElegantFooter(doc: any) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Footer with subtle background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, pageHeight - 18, pageWidth - 20, pageHeight - 18);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('PG Manager - Confidential Report', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 25, pageHeight - 10, { align: 'right' });
}

function addStyledMetricBox(doc: any, x: number, y: number, width: number, height: number, color: number[], label: string, value: string) {
  // Shadow
  doc.setFillColor(color[0] - 20, color[1] - 20, color[2] - 20, 0.5);
  doc.roundedRect(x + 2, y + 2, width, height, 3, 3, 'F');

  // Main box with gradient
  for (let i = 0; i < height; i++) {
    const ratio = i / height;
    const r = Math.round(color[0] * (1 - ratio * 0.2));
    const g = Math.round(color[1] * (1 - ratio * 0.2));
    const b = Math.round(color[2] * (1 - ratio * 0.2));
    doc.setFillColor(r, g, b);
    doc.rect(x, y + i, width, 1, 'F');
  }

  doc.roundedRect(x, y, width, height, 3, 3, 'S');
  doc.setDrawColor(255, 255, 255, 0.3);
  doc.setLineWidth(0.3);
  doc.line(x + 5, y + 3, x + width - 5, y + 3);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(label, x + width / 2, y + 12, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(value, x + width / 2, y + 24, { align: 'center' });
}

export async function generateMonthlyFinancialReport(
  month: string,
  year: number
): Promise<Blob> {
  const jsPDF = (await import('jspdf')).default;
  const { applyPlugin } = await import('jspdf-autotable');
  applyPlugin(jsPDF);
  const doc: any = new jsPDF();

  const [pg, persons, blocks] = await Promise.all([
    getCurrentPG(),
    getPersons(),
    getBlocks()
  ]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[parseInt(month) - 1] || month;

  const header: ReportHeader = {
    pgName: pg?.name || 'PG Manager',
    reportTitle: 'Monthly Financial Report',
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    period: `${monthName} ${year}`
  };

  addModernHeader(doc, header);

  const personsWithRooms = persons.map((p: any) => {
    const block = blocks.find((b: any) => b._id === p.blockId);
    return { ...p, blockName: block?.name || '' };
  });

  const activePersons = personsWithRooms.filter((p: any) => p.isActive);
  const totalExpected = activePersons.reduce((sum: number, p: any) => sum + (p.monthlyRent || 0), 0);

  const allPayments = await Promise.all(
    activePersons.map((p: any) => getPaymentsByPerson(p._id.toString()))
  );
  const allPaymentsFlat = allPayments.flat();

  const monthStr = `${year}-${month.padStart(2, '0')}`;
  const monthPayments = allPaymentsFlat.filter((p: any) => p.month === monthStr);

  const totalCollected = monthPayments
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const totalPending = monthPayments
    .filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const totalOverdue = allPaymentsFlat
    .filter((p: any) => {
      // Include payments already marked as overdue (for months up to the selected month)
      if (p.status === 'overdue' && p.month <= monthStr) {
        return true;
      }
      // Include pending payments from months before the selected month (they are now overdue)
      if (p.status === 'pending' && p.month < monthStr) {
        return true;
      }
      return false;
    })
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const startY = 70;
  const boxWidth = (doc.internal.pageSize.getWidth() - 60) / 4;

  addStyledMetricBox(doc, 15, startY, boxWidth, 35, [59, 130, 246], 'Expected', 'Rs. ' + totalExpected.toLocaleString());
  addStyledMetricBox(doc, 15 + boxWidth + 10, startY, boxWidth, 35, [16, 185, 129], 'Collected', 'Rs. ' + totalCollected.toLocaleString());
  addStyledMetricBox(doc, 15 + (boxWidth + 10) * 2, startY, boxWidth, 35, [245, 158, 11], 'Pending', 'Rs. ' + totalPending.toLocaleString());
  addStyledMetricBox(doc, 15 + (boxWidth + 10) * 3, startY, boxWidth, 35, [220, 38, 38], 'Overdue', 'Rs. ' + totalOverdue.toLocaleString());

  const paymentMethods: { [key: string]: { count: number; amount: number } } = {};
  monthPayments.forEach((p: any) => {
    if (!paymentMethods[p.paymentMethod]) {
      paymentMethods[p.paymentMethod] = { count: 0, amount: 0 };
    }
    paymentMethods[p.paymentMethod].count++;
    paymentMethods[p.paymentMethod].amount += p.amount;
  });

  const methodsData = Object.entries(paymentMethods).map(([method, data]: [string, any]) => [
    method.charAt(0).toUpperCase() + method.slice(1),
    data.count,
    'Rs. ' + data.amount.toLocaleString()
  ]);

  if (methodsData.length > 0) {
    doc.autoTable({
      startY: startY + 50,
      head: [['Payment Method', 'Count', 'Amount']],
      body: methodsData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 98, 217],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 10, cellPadding: 5 },
      margin: { left: 15, right: 15 },
      tableLineColor: [200, 210, 230],
      tableLineWidth: 0.2
    });
  }

  const occupancyRate = persons.length > 0
    ? Math.round((activePersons.length / persons.length) * 100)
    : 0;

  const collectionRate = totalExpected > 0
    ? Math.round((totalCollected / totalExpected) * 100)
    : 0;

  const occupancyData = [
    ['Total Residents', persons.length.toString()],
    ['Active Residents', activePersons.length.toString()],
    ['Occupancy Rate', `${occupancyRate}%`],
    ['Total Expected Rent', 'Rs. ' + totalExpected.toLocaleString()],
    ['Total Collected', 'Rs. ' + totalCollected.toLocaleString()],
    ['Collection Rate', `${collectionRate}%`]
  ];

  const finalY = doc.lastAutoTable?.finalY || startY + 70;

  doc.setFillColor(248, 250, 252);
  doc.rect(15, finalY + 10, doc.internal.pageSize.getWidth() - 30, 5, 'F');

  doc.autoTable({
    startY: finalY + 15,
    head: [['Metric', 'Value']],
    body: occupancyData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 98, 217],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [236, 242, 255], textColor: [41, 98, 217] },
      1: { fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  addElegantFooter(doc);
  return doc.output('blob');
}

export async function generateOccupancyReport(): Promise<Blob> {
  const jsPDF = (await import('jspdf')).default;
  const { applyPlugin } = await import('jspdf-autotable');
  applyPlugin(jsPDF);
  const doc: any = new jsPDF();

  const [pg, persons, blocks] = await Promise.all([
    getCurrentPG(),
    getPersons(),
    getBlocks()
  ]);

  const header: ReportHeader = {
    pgName: pg?.name || 'PG Manager',
    reportTitle: 'Occupancy Report',
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  };

  addModernHeader(doc, header);

  const blockData = blocks.map((block: any) => {
    const blockRooms = block.rooms || [];
    const totalRooms = blockRooms.length;
    const totalCapacity = blockRooms.reduce((sum: number, r: any) => sum + (r.capacity || 1),0);

    // Count occupied rooms by checking if any active person is assigned to each room
    let occupiedRooms = 0;
    const roomOccupancy: { [key: string]: number } = {};
    
    // Count persons in each room
    persons.forEach((p: any) => {
      if (p.blockId === block._id && p.isActive && p.roomNumber) {
        roomOccupancy[p.roomNumber] = (roomOccupancy[p.roomNumber] || 0) + 1;
      }
    });
    
    // Count rooms that have at least one person
    occupiedRooms = Object.keys(roomOccupancy).length;
    
    const currentOccupancy = persons.filter((p: any) => p.blockId === block._id && p.isActive).length;
    const occupancyRate = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

    // Count AC vs Non-AC rooms occupancy
    const acRoomsOccupied = blockRooms.filter((r: any) => {
      return r.isAC && roomOccupancy[r.roomNumber];
    }).length;
    
    const nonAcRoomsOccupied = blockRooms.filter((r: any) => {
      return !r.isAC && roomOccupancy[r.roomNumber];
    }).length;

    return {
      blockName: block.name,
      totalRooms,
      occupiedRooms,
      vacantRooms: totalRooms - occupiedRooms,
      totalCapacity,
      currentOccupancy,
      occupancyRate,
      acRooms: {
        occupied: acRoomsOccupied,
        vacant: blockRooms.filter((r: any) => r.isAC).length - acRoomsOccupied
      },
      nonAcRooms: {
        occupied: nonAcRoomsOccupied,
        vacant: blockRooms.filter((r: any) => !r.isAC).length - nonAcRoomsOccupied
      }
    };
  });

  const totalRoomsAll = blockData.reduce((sum, b) => sum + b.totalRooms, 0);
  const totalOccupiedAll = blockData.reduce((sum, b) => sum + b.occupiedRooms, 0);
  const totalCapacityAll = blockData.reduce((sum, b) => sum + b.totalCapacity, 0);
  const totalOccupancyAll = blockData.reduce((sum, b) => sum + b.currentOccupancy, 0);
  const overallRate = totalCapacityAll > 0 ? Math.round((totalOccupancyAll / totalCapacityAll) * 100) : 0;

  const startY = 70;
  const boxWidth = (doc.internal.pageSize.getWidth() - 50) / 3;

  addStyledMetricBox(doc, 15, startY, boxWidth, 35, [59, 130, 246], 'Total Rooms', totalRoomsAll.toString());
  addStyledMetricBox(doc, 15 + boxWidth + 10, startY, boxWidth, 35, [16, 185, 129], 'Occupied', totalOccupiedAll.toString());
  addStyledMetricBox(doc, 15 + (boxWidth + 10) * 2, startY, boxWidth, 35, [139, 92, 246], 'Occupancy Rate', `${overallRate}%`);

  const blockTableData = blockData.map((b) => [
    b.blockName,
    b.totalRooms.toString(),
    b.occupiedRooms.toString(),
    b.vacantRooms.toString(),
    b.totalCapacity.toString(),
    b.currentOccupancy.toString(),
    `${b.occupancyRate}%`
  ]);

  const finalY = startY + 50;

  doc.autoTable({
    startY: finalY,
    head: [['Block', 'Total Rooms', 'Occupied', 'Vacant', 'Capacity', 'Residents', 'Rate']],
    body: blockTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 98, 217],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 4 }
  });

  const acData = blockData.map((b) => [
    b.blockName,
    b.acRooms.occupied.toString(),
    b.acRooms.vacant.toString(),
    b.nonAcRooms.occupied.toString(),
    b.nonAcRooms.vacant.toString()
  ]);

  const finalY2 = doc.lastAutoTable?.finalY || finalY + 100;

  doc.autoTable({
    startY: finalY2 + 10,
    head: [['Block', 'AC Occupied', 'AC Vacant', 'Non-AC Occupied', 'Non-AC Vacant']],
    body: acData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 98, 217],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 4 }
  });

  addElegantFooter(doc);
  return doc.output('blob');
}

export async function generateResidentLedger(personId: string): Promise<Blob> {
  const jsPDF = (await import('jspdf')).default;
  const { applyPlugin } = await import('jspdf-autotable');
  applyPlugin(jsPDF);
  const doc: any = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const [pg, persons, payments] = await Promise.all([
    getCurrentPG(),
    getPersons().then((persons: any) => persons.find((p: any) => p._id === personId)),
    getPaymentsByPerson(personId)
  ]);

  if (!persons) {
    throw new Error('Person not found');
  }

  const header: ReportHeader = {
    pgName: pg?.name || 'PG Manager',
    reportTitle: 'Resident Ledger (Statement of Account)',
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  };

  addModernHeader(doc, header);

  const startY = 70;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Resident Details Section
  // doc.setFillColor(236, 242, 255);
  // doc.roundedRect(margin, startY, contentWidth, 55, 3, 3, 'F');
  // doc.setDrawColor(59, 130, 246);
  // doc.setLineWidth(0.3);
  // doc.roundedRect(margin, startY, contentWidth, 55, 3, 3, 'S');

  doc.setFontSize(12);
  doc.setTextColor(41, 98, 217);
  doc.setFont(undefined, 'bold');
  doc.text('Resident Details', margin + 10, startY + 0);

  const details = [
    ['Name', persons.name],
    ['Email', persons.email],
    ['Phone', persons.phone || 'N/A'],
    ['Room', persons.roomNumber || 'N/A'],
    ['Monthly Rent', 'Rs. ' + (persons.monthlyRent || 0).toLocaleString()],
    ['Move-in Date', persons.moveInDate
      ? new Date(persons.moveInDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A'
    ]
  ];

  doc.autoTable({
    startY: startY + 5,
    body: details,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, textColor: [100, 116, 139] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin + 10, right: margin + 10 }
  });

  // Payment History Section
  const finalY = doc.lastAutoTable?.finalY || startY + 60;
  const paymentStartY = finalY + 15;

  // Section header
  doc.setFillColor(41, 98, 217);
  doc.roundedRect(margin, paymentStartY, contentWidth, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Payment History', margin + 10, paymentStartY + 9);

  const sortedPayments = [...payments].sort((a: any, b: any) => {
    return new Date(b.month).getTime() - new Date(a.month).getTime();
  });

  const paymentData = sortedPayments.map((p: any) => [
    new Date(p.paymentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    p.month,
    'Rs. ' + p.amount.toLocaleString(),
    p.paymentMethod.charAt(0).toUpperCase() + p.paymentMethod.slice(1),
    p.status.charAt(0).toUpperCase() + p.status.slice(1)
  ]);

  doc.autoTable({
    startY: paymentStartY + 16,
    head: [['Date', 'Month', 'Amount', 'Method', 'Status']],
    body: paymentData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 98, 217],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 }
    }
  });

  // Summary Section
  const paidAmount = payments
    .filter((p: any) => p.status === 'paid')
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const pendingAmount = payments
    .filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const overdueAmount = payments
    .filter((p: any) => p.status === 'overdue')
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const finalY2 = doc.lastAutoTable?.finalY || paymentStartY + 100;
  const sumWidth = (contentWidth - 20) / 3;
  const sumStartY = finalY2 + 15;

  addStyledMetricBox(doc, margin, sumStartY, sumWidth, 30, [16, 185, 129], 'Paid', 'Rs. ' + paidAmount.toLocaleString());
  addStyledMetricBox(doc, margin + sumWidth + 10, sumStartY, sumWidth, 30, [245, 158, 11], 'Pending', 'Rs. ' + pendingAmount.toLocaleString());
  addStyledMetricBox(doc, margin + (sumWidth + 10) * 2, sumStartY, sumWidth, 30, [220, 38, 38], 'Overdue', 'Rs. ' + overdueAmount.toLocaleString());

  addElegantFooter(doc);
  return doc.output('blob');
}

export async function generateTaxExpenseSummary(
  startDate: string,
  endDate: string
): Promise<Blob> {
  const jsPDF = (await import('jspdf')).default;
  const { applyPlugin } = await import('jspdf-autotable');
  applyPlugin(jsPDF);
  const doc: any = new jsPDF();

  const [pg, expenses] = await Promise.all([
    getCurrentPG(),
    getExpenses(startDate, endDate)
  ]);

  const header: ReportHeader = {
    pgName: pg?.name || 'PG Manager',
    reportTitle: 'Tax-Ready Expense Summary',
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    period: `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  };

  addModernHeader(doc, header);

  const categoryTotals: { [key: string]: { total: number; deductible: number; nonDeductible: number; items: any[] } } = {};

  expenses.forEach((exp: any) => {
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = { total: 0, deductible: 0, nonDeductible: 0, items: [] };
    }
    categoryTotals[exp.category].total += exp.amount;
    if (exp.isDeductible) {
      categoryTotals[exp.category].deductible += exp.amount;
    } else {
      categoryTotals[exp.category].nonDeductible += exp.amount;
    }
    categoryTotals[exp.category].items.push(exp);
  });

  const categoryData = Object.entries(categoryTotals).map(([category, data]: [string, any]) => [
    category,
    'Rs. ' + data.total.toLocaleString(),
    'Rs. ' + data.deductible.toLocaleString(),
    'Rs. ' + data.nonDeductible.toLocaleString()
  ]);

  doc.autoTable({
    startY: 70,
    head: [['Category', 'Total', 'Tax Deductible', 'Non-Deductible']],
    body: categoryData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 98, 217],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 4 }
  });

  const totalDeductible = expenses
    .filter((e: any) => e.isDeductible)
    .reduce((sum: number, e: any) => sum + e.amount, 0);
  const totalNonDeductible = expenses
    .filter((e: any) => !e.isDeductible)
    .reduce((sum: number, e: any) => sum + e.amount, 0);
  const grandTotal = totalDeductible + totalNonDeductible;

  const summaryY = doc.lastAutoTable?.finalY || 140;
  const sumWidth = (doc.internal.pageSize.getWidth() - 60) / 3;

  addStyledMetricBox(doc, 15, summaryY + 10, sumWidth, 32, [16, 185, 129], 'Deductible', 'Rs. ' + totalDeductible.toLocaleString());
  addStyledMetricBox(doc, 15 + sumWidth + 10, summaryY + 10, sumWidth, 32, [245, 158, 11], 'Non-Deductible', 'Rs. ' + totalNonDeductible.toLocaleString());
  addStyledMetricBox(doc, 15 + (sumWidth + 10) * 2, summaryY + 10, sumWidth, 32, [59, 130, 246], 'Grand Total', 'Rs. ' + grandTotal.toLocaleString());

  const finalY = summaryY + 55;
  const expenseData = expenses.map((exp: any) => [
    new Date(exp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    exp.category,
    exp.description || 'N/A',
    'Rs. ' + exp.amount.toLocaleString(),
    exp.isDeductible ? 'Yes' : 'No'
  ]);

  doc.autoTable({
    startY: finalY,
    head: [['Date', 'Category', 'Description', 'Amount', 'Deductible']],
    body: expenseData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 98, 217],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: { fontSize: 9, cellPadding: 4 },
    margin: { left: 15, right: 15 }
  });

  addElegantFooter(doc);
  return doc.output('blob');
}

export async function downloadPDF(blob: Blob, filename: string) {
  const pdfBlob = new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
