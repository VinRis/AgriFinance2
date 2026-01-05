'use client';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Download, Printer, Calendar as CalendarIcon } from 'lucide-react';
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

interface PnLData {
  monthlyData: {
    month: string;
    income: number;
    expenses: number;
    netProfit: number;
  }[];
  annualTotals: {
    income: number;
    expenses: number;
    netProfit: number;
  };
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
  
  const pnlData: PnLData = useMemo(() => {
    const yearlyTransactions = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
    const monthlyData = months.map((month, index) => {
        const monthTransactions = yearlyTransactions.filter(t => new Date(t.date).getMonth() === index);
        const income = monthTransactions.filter(t => t.transactionType === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expenses = monthTransactions.filter(t => t.transactionType === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { month, income, expenses, netProfit: income - expenses };
    });

    const annualTotals = monthlyData.reduce((acc, data) => {
        acc.income += data.income;
        acc.expenses += data.expenses;
        acc.netProfit += data.netProfit;
        return acc;
    }, { income: 0, expenses: 0, netProfit: 0 });

    return { monthlyData, annualTotals };
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
  
  const generatePnLCSV = () => {
    const { monthlyData, annualTotals } = pnlData;
    if (monthlyData.every(d => d.income === 0 && d.expenses === 0)) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: `There is no data for the year ${selectedYear}.`
      });
      return;
    }

    const headers = ['Month', 'Income', 'Expenses', 'Net Profit'];
    const csvRows = [
      headers.join(','),
      ...monthlyData.map(d => [d.month, d.income, d.expenses, d.netProfit].join(',')),
      ['Annual Total', annualTotals.income, annualTotals.expenses, annualTotals.netProfit].join(',')
    ];
    const csv = csvRows.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${livestockType}-pnl-report-${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handlePrint = () => {
    window.print();
  };

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
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <Card className="no-print w-full">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
             <CardDescription>
                Generate and export your financial data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>You can export all your transaction data as a CSV file or print a professional summary of your records.</p>
             <div className="mt-6 flex flex-col sm:flex-row gap-4">
                 <Button onClick={generateFullReportCSV} disabled={transactions.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All as CSV
                </Button>
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Financial Summary
                </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="no-print w-full">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Profit & Loss Statement</CardTitle>
                        <CardDescription>
                            Yearly financial performance by month for {selectedYear}.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center w-full sm:w-auto">
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={generatePnLCSV} variant="outline" size="icon" disabled={pnlData.monthlyData.every(d => d.income === 0 && d.expenses === 0)}>
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Export P&L</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                 <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="text-left">
                            <th className="p-3 font-medium">Month</th>
                            <th className="p-3 font-medium text-right">Income</th>
                            <th className="p-3 font-medium text-right">Expenses</th>
                            <th className="p-3 font-medium text-right">Net Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pnlData.monthlyData.map((data, index) => (
                          <tr key={data.month} className="border-b last:border-none">
                              <td className="p-3 font-medium">{data.month}</td>
                              <td className="p-3 text-right text-green-600">{formatCurrency(data.income, settings.currency)}</td>
                              <td className="p-3 text-right text-red-600">{formatCurrency(data.expenses, settings.currency)}</td>
                              <td className={`p-3 text-right font-semibold ${data.netProfit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                {formatCurrency(data.netProfit, settings.currency)}
                              </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-bold">
                        <tr>
                            <td className="p-3">Annual Total</td>
                            <td className="p-3 text-right text-green-600">{formatCurrency(pnlData.annualTotals.income, settings.currency)}</td>
                            <td className="p-3 text-right text-red-600">{formatCurrency(pnlData.annualTotals.expenses, settings.currency)}</td>
                            <td className={`p-3 text-right font-semibold ${pnlData.annualTotals.netProfit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                {formatCurrency(pnlData.annualTotals.netProfit, settings.currency)}
                            </td>
                        </tr>
                    </tfoot>
                 </table>
              </div>
            </CardContent>
        </Card>
        
        {/* Printable Report Layout */}
        <div className="print-only">
            {/* Page 1: Financial Summary */}
            <div className="print-page">
                <ReportHeader title="Financial Performance Summary" year={selectedYear} />
                <div className="p-4 sm:p-8 space-y-8">
                    {/* KPIs */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-6 text-center">
                        <div className="bg-gray-100 p-2 sm:p-4 rounded-lg shadow">
                            <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Revenue</h3>
                            <p className="text-base sm:text-2xl font-bold text-green-600">{formatCurrency(aggregatedData.totalRevenue, settings.currency)}</p>
                        </div>
                        <div className="bg-gray-100 p-2 sm:p-4 rounded-lg shadow">
                            <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Expenses</h3>
                            <p className="text-base sm:text-2xl font-bold text-red-600">{formatCurrency(aggregatedData.totalExpenses, settings.currency)}</p>
                        </div>
                        <div className="bg-gray-100 p-2 sm:p-4 rounded-lg shadow">
                            <h3 className="text-xs sm:text-sm font-medium text-gray-500">Net Profit</h3>
                            <p className={`text-base sm:text-2xl font-bold ${aggregatedData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(aggregatedData.netProfit, settings.currency)}
                            </p>
                        </div>
                    </div>
                    
                    {/* Charts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8" style={{height: '300px'}}>
                        <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 text-center">Income vs. Expenses</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[{ name: 'Financials', revenue: aggregatedData.totalRevenue, expenses: aggregatedData.totalExpenses }]}>
                                    <XAxis dataKey="name" stroke="#888" fontSize={10} />
                                    <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `${settings.currency}${v.toLocaleString('en-US')}`} />
                                    <Tooltip formatter={(v: number) => formatCurrency(v, settings.currency)} />
                                    <Legend wrapperStyle={{fontSize: "10px"}}/>
                                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 text-center">Expense Breakdown</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={aggregatedData.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {aggregatedData.expensesByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => formatCurrency(v, settings.currency)} />
                                    <Legend wrapperStyle={{fontSize: "10px", bottom: -5}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                 <footer className="page-footer">
                    <p>&copy; {new Date().getFullYear()} {settings.farmName}. All rights reserved.</p>
                    <p>Agri Finance - Financial Management Simplified</p>
                </footer>
            </div>

            {/* Page 2: P&L Statement */}
            <div className="print-page">
                <ReportHeader title={`Profit & Loss Statement`} year={selectedYear} />
                <div className="p-4 sm:p-8">
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left">
                                    <th className="p-3 font-medium text-gray-600">Month</th>
                                    <th className="p-3 font-medium text-gray-600 text-right">Income</th>
                                    <th className="p-3 font-medium text-gray-600 text-right">Expenses</th>
                                    <th className="p-3 font-medium text-gray-600 text-right">Net Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pnlData.monthlyData.map((data, index) => (
                                <tr key={data.month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="p-3 text-gray-800 font-medium">{data.month}</td>
                                    <td className="p-3 text-right text-green-600">{formatCurrency(data.income, settings.currency)}</td>
                                    <td className="p-3 text-right text-red-600">{formatCurrency(data.expenses, settings.currency)}</td>
                                    <td className={`p-3 text-right font-semibold ${data.netProfit >= 0 ? 'text-gray-800' : 'text-red-700'}`}>
                                        {formatCurrency(data.netProfit, settings.currency)}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold">
                                <tr>
                                    <td className="p-3 text-gray-800">Annual Total</td>
                                    <td className="p-3 text-right text-green-700">{formatCurrency(pnlData.annualTotals.income, settings.currency)}</td>
                                    <td className="p-3 text-right text-red-700">{formatCurrency(pnlData.annualTotals.expenses, settings.currency)}</td>
                                    <td className={`p-3 text-right font-semibold ${pnlData.annualTotals.netProfit >= 0 ? 'text-gray-900' : 'text-red-800'}`}>
                                        {formatCurrency(pnlData.annualTotals.netProfit, settings.currency)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                 <footer className="page-footer">
                    <p>&copy; {new Date().getFullYear()} {settings.farmName}. All rights reserved.</p>
                    <p>Agri Finance - Financial Management Simplified</p>
                </footer>
            </div>
        </div>
    </div>
  );
}
