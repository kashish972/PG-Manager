'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { getCurrentPG } from '@/actions/pg.actions';
import { getPersons } from '@/actions/person.actions';
import { getBlocks } from '@/actions/block.actions';
import { 
  generateMonthlyFinancialReport, 
  generateOccupancyReport, 
  generateResidentLedger, 
  generateTaxExpenseSummary,
  downloadPDF
} from '@/lib/pdf-reports';
import { getExpenses } from '@/actions/expense.actions';
import { FileText, Building2, User, Receipt, Download, Calendar, Eye, EyeOff } from 'lucide-react';
import { useEffect } from 'react';
import styles from './page.module.css';

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });
  const [persons, setPersons] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');

  // Load persons on component mount
  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = async () => {
    const data = await getPersons();
    setPersons(data || []);
  };

  const handlePreview = async (type: string) => {
    setLoading(type);
    try {
      let blob: Blob;
      const [year, month] = selectedMonth.split('-').map(Number);
      
      switch (type) {
        case 'monthly':
          blob = await generateMonthlyFinancialReport(
            month.toString().padStart(2, '0'),
            year
          );
          break;
        case 'occupancy':
          blob = await generateOccupancyReport();
          break;
        case 'ledger':
          if (!selectedPerson) {
            alert('Please select a resident');
            setLoading(null);
            return;
          }
          blob = await generateResidentLedger(selectedPerson);
          break;
        case 'tax':
          blob = await generateTaxExpenseSummary(dateRange.start, dateRange.end);
          break;
        default:
          return;
      }
      
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType(type);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to generate preview');
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async (type: string) => {
    setLoading(type);
    try {
      let blob: Blob;
      const [year, month] = selectedMonth.split('-').map(Number);
      let filename = '';
      
      switch (type) {
        case 'monthly':
          blob = await generateMonthlyFinancialReport(
            month.toString().padStart(2, '0'),
            year
          );
          filename = `monthly-financial-${selectedMonth}.pdf`;
          break;
        case 'occupancy':
          blob = await generateOccupancyReport();
          filename = `occupancy-report-${new Date().toISOString().slice(0, 10)}.pdf`;
          break;
        case 'ledger':
          if (!selectedPerson) {
            alert('Please select a resident');
            setLoading(null);
            return;
          }
          blob = await generateResidentLedger(selectedPerson);
          const person = persons.find(p => p._id === selectedPerson);
          filename = `ledger-${person?.name || 'resident'}-${new Date().toISOString().slice(0, 10)}.pdf`;
          break;
        case 'tax':
          blob = await generateTaxExpenseSummary(dateRange.start, dateRange.end);
          filename = `tax-expense-${dateRange.start}-to-${dateRange.end}.pdf`;
          break;
        default:
          return;
      }
      
      downloadPDF(blob, filename);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report');
    } finally {
      setLoading(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewType('');
  };

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>PDF Reports</h1>
          <p className={styles.subtitle}>Generate, preview and download financial reports for your PG</p>
        </div>

        {previewUrl && (
          <div className={styles.previewOverlay}>
            <div className={styles.previewContainer}>
              <div className={styles.previewHeader}>
                <h2>Report Preview</h2>
                <button onClick={closePreview} className={styles.closeBtn}>
                  <EyeOff size={20} /> Close Preview
                </button>
              </div>
              <iframe
                src={previewUrl}
                className={styles.previewFrame}
                title="PDF Preview"
              />
            </div>
          </div>
        )}

        <div className={styles.reportsGrid}>
          {/* Monthly Financial Report */}
          <div className={styles.reportCard}>
            <div className={styles.reportIcon} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <FileText size={24} />
            </div>
            <h3>Monthly Financial Report</h3>
            <p>Complete financial summary for a specific month including expected vs collected amounts, pending/overdue status, and payment methods breakdown.</p>
            <div className={styles.reportAction}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={styles.dateInput}
              />
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => handlePreview('monthly')}
                  disabled={loading !== null}
                  className={`${styles.previewBtn} ${loading === 'monthly' ? styles.loading : ''}`}
                >
                  {loading === 'monthly' ? 'Generating...' : (
                    <>
                      <Eye size={16} />
                      Preview
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload('monthly')}
                  disabled={loading !== null}
                  className={styles.downloadBtn}
                >
                  {loading === 'monthly' ? 'Generating...' : (
                    <>
                      <Download size={16} />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Occupancy Report */}
          <div className={styles.reportCard}>
            <div className={styles.reportIcon} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Building2 size={24} />
            </div>
            <h3>Occupancy Report</h3>
            <p>Block-wise occupancy details, AC vs Non-AC breakdown, and overall occupancy rates for your PG.</p>
            <div className={styles.reportAction}>
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => handlePreview('occupancy')}
                  disabled={loading !== null}
                  className={`${styles.previewBtn} ${loading === 'occupancy' ? styles.loading : ''}`}
                >
                  {loading === 'occupancy' ? 'Generating...' : (
                    <>
                      <Eye size={16} />
                      Preview
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload('occupancy')}
                  disabled={loading !== null}
                  className={styles.downloadBtn}
                >
                  {loading === 'occupancy' ? 'Generating...' : (
                    <>
                      <Download size={16} />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Resident Ledger */}
          <div className={styles.reportCard}>
            <div className={styles.reportIcon} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <User size={24} />
            </div>
            <h3>Resident Ledger</h3>
            <p>Complete statement of account for a resident including payment history, pending/overdue amounts, and rent details.</p>
            <div className={styles.reportAction}>
              <select
                value={selectedPerson}
                onChange={(e) => {
                  setSelectedPerson(e.target.value);
                  if (!persons.length) loadPersons();
                }}
                className={styles.selectInput}
              >
                <option value="">Select Resident...</option>
                {persons.map((p: any) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => handlePreview('ledger')}
                  disabled={loading !== null || !selectedPerson}
                  className={`${styles.previewBtn} ${loading === 'ledger' ? styles.loading : ''}`}
                >
                  {loading === 'ledger' ? 'Generating...' : (
                    <>
                      <Eye size={16} />
                      Preview
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload('ledger')}
                  disabled={loading !== null || !selectedPerson}
                  className={styles.downloadBtn}
                >
                  {loading === 'ledger' ? 'Generating...' : (
                    <>
                      <Download size={16} />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tax-Ready Expense Summary */}
          {/* <div className={styles.reportCard}>
            <div className={styles.reportIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Receipt size={24} />
            </div>
            <h3>Tax-Ready Expense Summary</h3>
            <p>Category-wise expense breakdown with deductible vs non-deductible amounts for tax filing purposes.</p>
            <div className={styles.reportAction}>
              <div className={styles.dateRange}>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className={styles.dateInput}
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => handlePreview('tax')}
                  disabled={loading !== null}
                  className={`${styles.previewBtn} ${loading === 'tax' ? styles.loading : ''}`}
                >
                  {loading === 'tax' ? 'Generating...' : (
                    <>
                      <Eye size={16} />
                      Preview
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDownload('tax')}
                  disabled={loading !== null}
                  className={styles.downloadBtn}
                >
                  {loading === 'tax' ? 'Generating...' : (
                    <>
                      <Download size={16} />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </MainLayout>
  );
}
