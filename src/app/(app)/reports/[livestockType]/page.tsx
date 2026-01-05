'use client';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LivestockType } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportsPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;

  const { getTransactions, settings } = useAppContext();

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }
  
  const title = livestockType === 'dairy' ? 'Dairy Reports' : 'Poultry Reports';
  const transactions = getTransactions(livestockType);

  const generateCSV = () => {
    if (transactions.length === 0) return;
    const headers = Object.keys(transactions[0] || {}).join(',');
    const csv = [
      headers,
      ...transactions.map(row =>
        Object.values(row).map(value => JSON.stringify(value, (_, val) => val ?? '')).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${livestockType}-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <Card className="no-print">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
             <CardDescription>
                Generate and export your financial data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>You can export your data as a CSV file or print a summary of your records.</p>
            <div className="mt-6 flex gap-4">
                 <Button onClick={generateCSV} disabled={transactions.length === 0}>
                    <Download className="mr-2" />
                    Export as CSV
                </Button>
                <Button onClick={handlePrint} variant="outline">Print Summary</Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="print-only">
          <h1 className="text-2xl font-bold">{settings.farmName} - {title}</h1>
          <p className="mb-4">{new Date().toLocaleDateString()}</p>
          <table className="w-full border-collapse border">
            <thead>
              <tr>
                {transactions.length > 0 && Object.keys(transactions[0]).map(key => <th className="border p-2 text-left" key={key}>{key}</th>)}
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id}>
                  {Object.values(transaction).map((val, i) => <td className="border p-2" key={i}>{String(val)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}
