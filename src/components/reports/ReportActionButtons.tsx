import { Button } from '@/src/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { exportReportToExcel, printReportTable, ReportColumn } from '@/src/lib/reportExport';
import { toast } from 'sonner';

export function ReportActionButtons({
  data, columns, filename, title, subtitle
}: {
  data: any[];
  columns: ReportColumn[];
  filename: string;
  title: string;
  subtitle?: string;
}) {
  const handleExcel = () => {
    const ok = exportReportToExcel(data, filename);
    if (!ok) toast.error('No data to export');
  };

  const handlePrint = () => {
    if (!data || data.length === 0) { toast.error('No data to print'); return; }
    printReportTable(title, columns, data, subtitle);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExcel}>
        <Download className="h-4 w-4 mr-2" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" /> Print
      </Button>
    </div>
  );
}
