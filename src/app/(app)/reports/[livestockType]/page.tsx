'use client';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LivestockType } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Download, Printer, BarChart as BarChartIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AggregatedData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  incomeByCategory: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
}

function formatCurrency(amount: number, currency: string) {
    return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
const months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];


export default function ReportsPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;

  const { getTransactions, settings } = useAppContext();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }
  
  const title = livestockType === 'dairy' ? 'Dairy Reports' : 'Poultry Reports';
  const transactions = getTransactions(livestockType);

  const aggregatedData: AggregatedData = useMemo(() => {
    const yearlyTransactions = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);

    const data: AggregatedData = {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalTransactions: yearlyTransactions.length,
      incomeByCategory: [],
      expensesByCategory: []
    };

    const incomeMap: { [key: string]: number } = {};
    const expenseMap: { [key: string]: number } = {};

    yearlyTransactions.forEach(t => {
      if (t.transactionType === 'income') {
        data.totalRevenue += t.amount;
        incomeMap[t.category] = (incomeMap[t.category] || 0) + t.amount;
      } else {
        data.totalExpenses += t.amount;
        expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
      }
    });

    data.netProfit = data.totalRevenue - data.totalExpenses;
    data.incomeByCategory = Object.entries(incomeMap).map(([name, value]) => ({ name, value }));
    data.expensesByCategory = Object.entries(expenseMap).map(([name, value]) => ({ name, value }));
    
    return data;
  }, [transactions, selectedYear]);
  
  const generateFullReportCSV = () => {
    if (transactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no transactions to export.'
      });
      return;
    };
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
    link.setAttribute('download', `${livestockType}-full-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const generateReportSummary = (data: AggregatedData, currency: string, year: number): string => {
    if (data.totalTransactions === 0) {
      return `For the year ${year}, there is no financial data to analyze for this enterprise. Start by logging some transactions to see a summary here.`;
    }

    const { totalRevenue, totalExpenses, netProfit } = data;
    let summary = `In ${year}, the enterprise generated a total revenue of ${formatCurrency(totalRevenue, currency)} and incurred total expenses of ${formatCurrency(totalExpenses, currency)}. `;
    
    if (netProfit > 0) {
      summary += `This resulted in a healthy net profit of ${formatCurrency(netProfit, currency)}, indicating a profitable year.`;
    } else if (netProfit < 0) {
      summary += `This resulted in a net loss of ${formatCurrency(Math.abs(netProfit), currency)}. This suggests that expenses exceeded income, and a review of cost-saving measures may be beneficial.`;
    } else {
      summary += "The enterprise broke even, with revenues exactly matching expenses.";
    }

    const highestExpense = data.expensesByCategory.length > 0 
      ? data.expensesByCategory.reduce((max, cat) => cat.value > max.value ? cat : max)
      : null;
      
    if (highestExpense) {
      summary += ` The largest expense category was "${highestExpense.name}", accounting for ${formatCurrency(highestExpense.value, currency)} of the total costs.`;
    }

    return summary;
  };


  const reportSummary = generateReportSummary(aggregatedData, settings.currency, selectedYear);
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const ReportHeader = ({ title, year }: { title: string, year: number }) => (
    <header className="text-center page-header px-4 sm:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{settings.farmName}</h1>
        <p className="text-sm sm:text-base text-gray-600">{settings.location}</p>
        <p className="text-xs sm:text-sm text-gray-500">Prepared by: {settings.managerName}</p>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mt-4">{title}</h2>
        <p className="text-xs sm:text-sm text-gray-500">For the Year Ended December 31, {year}</p>
        <p className="text-xs sm:text-sm text-gray-500">Report Date: {new Date().toLocaleDateString()}</p>
    </header>
  );

  return (
    <>
      <main className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
          <Card className="no-print w-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>
                      Generate and export your financial data for {selectedYear}.
                  </CardDescription>
                </div>
                 <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">Use the buttons below to export a full CSV of all transactions or print a professional financial summary for the selected year.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={generateFullReportCSV} disabled={transactions.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      Export All as CSV
                  </Button>
                  <Button onClick={handlePrint} variant="outline" disabled={transactions.length === 0}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Financial Summary
                  </Button>
              </div>
            </CardContent>
          </Card>
      </main>
        
      {/* Printable Report Layout */}
      <div className="print-only">
          <div className="print-page">
              <ReportHeader title="Financial Performance Summary" year={selectedYear} />
              <div className="p-4 sm:p-8 space-y-6 flex-grow">
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-100 p-4 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(aggregatedData.totalRevenue, settings.currency)}</p>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                          <p className="text-2xl font-bold text-red-600">{formatCurrency(aggregatedData.totalExpenses, settings.currency)}</p>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-lg shadow">
                          <h3 className="text-sm font-medium text-gray-500">Net Profit</h3>
                          <p className={`text-2xl font-bold ${aggregatedData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {formatCurrency(aggregatedData.netProfit, settings.currency)}
                          </p>
                      </div>
                  </div>
                  
                   <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">Executive Summary</h3>
                      <p className="text-sm text-gray-600 text-justify">{reportSummary}</p>
                   </div>
                  
                  {aggregatedData.totalTransactions > 0 ? (
                    <div className="grid grid-cols-2 gap-8 pt-6" style={{minHeight: '350px'}}>
                        <div className="flex flex-col items-center">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Income vs. Expenses</h3>
                            <BarChart 
                                width={400} height={250} 
                                data={[{ name: 'Financials', revenue: aggregatedData.totalRevenue, expenses: aggregatedData.totalExpenses }]}
                                isAnimationActive={false}
                            >
                                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                                <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `${settings.currency}${v.toLocaleString()}`} />
                                <Tooltip formatter={(v: number) => formatCurrency(v, settings.currency)} />
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                                <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                            </BarChart>
                        </div>
                        <div className="flex flex-col items-center">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Expense Breakdown</h3>
                             <PieChart width={400} height={250}>
                                <Pie 
                                    data={aggregatedData.expensesByCategory} 
                                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                                    isAnimationActive={false}
                                >
                                    {aggregatedData.expensesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => formatCurrency(v, settings.currency)} />
                                <Legend wrapperStyle={{fontSize: "12px", bottom: -5}} iconSize={10}/>
                            </PieChart>
                        </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 py-20">
                      No financial data available for the selected year.
                    </div>
                  )}
              </div>
              <footer className="page-footer">
                  <p>&copy; {new Date().getFullYear()} {settings.farmName}. All rights reserved.</p>
                  <p>Agri Finance - Financial Management Simplified</p>
              </footer>
          </div>
      </div>
    </>
  );
}
