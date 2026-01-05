'use client';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Download, Printer, DollarSign, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart, Cell } from 'recharts';

interface AggregatedData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  incomeByCategory: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
}

export default function ReportsPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;

  const { getTransactions, settings } = useAppContext();
  const { toast } = useToast();

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }
  
  const title = livestockType === 'dairy' ? 'Dairy Reports' : 'Poultry Reports';
  const transactions = getTransactions(livestockType);

  const aggregatedData: AggregatedData = useMemo(() => {
    const data: AggregatedData = {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalTransactions: transactions.length,
      incomeByCategory: [],
      expensesByCategory: []
    };

    const incomeMap: { [key: string]: number } = {};
    const expenseMap: { [key: string]: number } = {};

    transactions.forEach(t => {
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
  }, [transactions]);

  const generateCSV = () => {
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

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
            <p>You can export all your data as a CSV file or print a professional summary of your records.</p>
             <div className="mt-6 flex flex-col sm:flex-row gap-4">
                 <Button onClick={generateCSV} disabled={transactions.length === 0}>
                    <Download className="mr-2" />
                    Export All as CSV
                </Button>
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="mr-2" />
                  Print Financial Summary
                </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Printable Report Layout */}
        <div className="print-only">
          <div className="p-8 space-y-8 bg-white text-black">
            {/* Header */}
            <header className="text-center">
              <h1 className="text-3xl font-bold text-gray-800">{settings.farmName}</h1>
              <p className="text-gray-600">{settings.location}</p>
              <p className="text-sm text-gray-500">Prepared by: {settings.managerName}</p>
              <p className="text-sm text-gray-500">Report Date: {new Date().toLocaleDateString()}</p>
            </header>

            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">Financial Performance Summary</h2>
              
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                <div className="bg-gray-100 p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                  <p className="text-2xl font-bold text-green-600">{settings.currency}{aggregatedData.totalRevenue.toFixed(2)}</p>
                </div>
                 <div className="bg-gray-100 p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                  <p className="text-2xl font-bold text-red-600">{settings.currency}{aggregatedData.totalExpenses.toFixed(2)}</p>
                </div>
                 <div className="bg-gray-100 p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Net Profit</h3>
                  <p className={`text-2xl font-bold ${aggregatedData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {settings.currency}{aggregatedData.netProfit.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-2 gap-8 mb-8" style={{height: '300px'}}>
                  <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">Income vs. Expenses</h3>
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{ name: 'Financials', revenue: aggregatedData.totalRevenue, expenses: aggregatedData.totalExpenses }]}>
                              <XAxis dataKey="name" stroke="#888" fontSize={12} />
                              <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `${settings.currency}${v}`} />
                              <Tooltip formatter={(v: number) => `${settings.currency}${v.toFixed(2)}`} />
                              <Legend />
                              <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
                  <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">Expense Breakdown</h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={aggregatedData.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                  {aggregatedData.expensesByCategory.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => `${settings.currency}${v.toFixed(2)}`} />
                              <Legend />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              
              {/* Transaction Table */}
              <div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-4">Transaction Details</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="p-3 text-left font-medium text-gray-600">Date</th>
                                  <th className="p-3 text-left font-medium text-gray-600">Description</th>
                                  <th className="p-3 text-left font-medium text-gray-600">Category</th>
                                  <th className="p-3 text-right font-medium text-gray-600">Amount</th>
                              </tr>
                          </thead>
                          <tbody>
                              {transactions.map((t, index) => (
                                  <tr key={t.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="p-3 text-gray-700">{new Date(t.date).toLocaleDateString()}</td>
                                      <td className="p-3 text-gray-800 font-medium">{t.description}</td>
                                      <td className="p-3 text-gray-700">{t.category}</td>
                                      <td className={`p-3 text-right font-semibold ${t.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                          {t.transactionType === 'income' ? '+' : '-'}
                                          {settings.currency}{t.amount.toFixed(2)}
                                      </td>
                                  </tr>
                              ))}
                               {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-6 text-gray-500">No transactions for this period.</td>
                                </tr>
                               )}
                          </tbody>
                      </table>
                  </div>
              </div>
            </div>

             <footer className="text-center text-xs text-gray-400 border-t pt-4">
                <p>&copy; {new Date().getFullYear()} {settings.farmName}. All rights reserved.</p>
                <p>AgriFinance Pro - Financial Management Simplified</p>
            </footer>
          </div>
        </div>
    </div>
  );
}
