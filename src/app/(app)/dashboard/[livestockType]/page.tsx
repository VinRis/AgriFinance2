'use client';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { DollarSign, TrendingUp, TrendingDown, BookOpen, Lightbulb } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Pie, PieChart, Cell, Legend } from 'recharts';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AggregatedData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  barChartData: { date: string; revenue: number; expenses: number }[];
  pieChartData: { name: string; value: number }[];
}

function aggregateData(transactions: AgriTransaction[]): AggregatedData {
    const dailyData: { [key: string]: { revenue: number; expenses: number } } = {};
    const expenseCategories: { [key: string]: number } = {};

    transactions.forEach(t => {
        const date = new Date(t.date).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = { revenue: 0, expenses: 0 };
        }
        if (t.transactionType === 'income') {
            dailyData[date].revenue += t.amount;
        } else {
            dailyData[date].expenses += t.amount;
            expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
        }
    });

    const barChartData = Object.entries(dailyData)
        .map(([date, data]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            ...data
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

    const pieChartData = Object.entries(expenseCategories).map(([name, value]) => ({ name, value }));

    const { totalRevenue, totalExpenses } = transactions.reduce(
        (acc, t) => {
            if (t.transactionType === 'income') acc.totalRevenue += t.amount;
            else acc.totalExpenses += t.amount;
            return acc;
        },
        { totalRevenue: 0, totalExpenses: 0 }
    );

    return {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalTransactions: transactions.length,
        barChartData,
        pieChartData,
    };
}

function generateFinancialSummary(data: AggregatedData, currency: string): string {
  if (data.totalTransactions === 0) {
    return 'There is no transaction data to analyze for the selected period.';
  }

  const { totalRevenue, totalExpenses, netProfit, pieChartData } = data;
  let summary = `You've logged ${data.totalTransactions} transactions. Your total income is ${currency}${totalRevenue.toFixed(2)} and total expenses are ${currency}${totalExpenses.toFixed(2)}, resulting in a net profit of ${currency}${netProfit.toFixed(2)}. `;

  if (pieChartData.length > 0) {
    const highestExpenseCategory = pieChartData.reduce((max, cat) => cat.value > max.value ? cat : max);
    summary += `Your largest expense category is "${highestExpenseCategory.name}" at ${currency}${highestExpenseCategory.value.toFixed(2)}. `;
  }

  if (netProfit > 0) {
    summary += 'Keep up the great work!';
  } else {
    summary += 'Keep a close eye on your expenses to improve profitability.';
  }

  return summary;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' },
  { value: 2, label: 'March' }, { value: 3, label: 'April' },
  { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, label: 'August' },
  { value: 8, label: 'September' }, { value: 9, label: 'October' },
  { value: 10, label: 'November' }, { value: 11, label: 'December' },
];

export default function DashboardPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;
  
  const { getTransactions, settings, isHydrated } = useAppContext();
  
  const [filterType, setFilterType] = useState('all');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }
  
  const allTransactions = getTransactions(livestockType);

  const filteredTransactions = useMemo(() => {
    if (!isHydrated) return [];
    if (filterType === 'all') return allTransactions;

    const now = new Date();
    return allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      if (filterType === 'ytd') {
        return transactionDate.getFullYear() === now.getFullYear();
      }
      if (filterType === 'year') {
        return transactionDate.getFullYear() === selectedYear;
      }
      if (filterType === 'month') {
        return transactionDate.getFullYear() === selectedYear && transactionDate.getMonth() === selectedMonth;
      }
      return true;
    });
  }, [allTransactions, filterType, selectedYear, selectedMonth, isHydrated]);


  const aggregatedData = aggregateData(filteredTransactions);
  const { totalRevenue, totalExpenses, netProfit, totalTransactions, barChartData, pieChartData } = aggregatedData;
  const financialSummary = generateFinancialSummary(aggregatedData, settings.currency);
  
  const KPICard = ({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType, description: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isHydrated ? (
          <>
            <div className="text-xl md:text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        ) : (
          <>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full mt-1" />
          </>
        )}
      </CardContent>
    </Card>
  );

  const COLORS = useMemo(() => [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--accent))',
  ], []);

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <Card>
            <CardHeader>
                <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="ytd">Year to Date</SelectItem>
                        <SelectItem value="year">By Year</SelectItem>
                        <SelectItem value="month">By Month</SelectItem>
                    </SelectContent>
                </Select>
                {filterType === 'year' && (
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                         <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
                 {filterType === 'month' && (
                    <>
                         <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </>
                )}
            </CardContent>
        </Card>

       <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <KPICard
                title="Total Revenue"
                value={`${settings.currency} ${totalRevenue.toFixed(2)}`}
                icon={DollarSign}
                description="Total income from sales."
            />
             <KPICard
                title="Total Expenses"
                value={`${settings.currency} ${totalExpenses.toFixed(2)}`}
                icon={DollarSign}
                description="Total expenses incurred."
            />
            <KPICard
                title="Net Profit"
                value={`${settings.currency} ${netProfit.toFixed(2)}`}
                icon={netProfit >= 0 ? TrendingUp : TrendingDown}
                description="Profit after expenses."
            />
            <KPICard
                title="Transactions"
                value={totalTransactions.toString()}
                icon={BookOpen}
                description="Total number of entries."
            />
       </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
              <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                  <CardDescription>A summary of income and expenses. Bar chart shows last 30 days of selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                  {isHydrated && filteredTransactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${settings.currency}${value}`} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: 'var(--radius)'
                            }}
                            labelStyle={{
                              color:'hsl(var(--foreground))'
                            }}
                            itemStyle={{
                              fontWeight: 'bold'
                            }}
                          />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                          <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
                      </BarChart>
                  </ResponsiveContainer>
                  ) : isHydrated ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data for this period.
                    </div>
                  ) : <Skeleton className="w-full h-[300px]" />}
              </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>A breakdown of expenses by category for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
              {isHydrated && pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (percent > 0.05) ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)'
                        }}
                        formatter={(value: number) => `${settings.currency} ${value.toFixed(2)}`}
                    />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              ) : isHydrated ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No expense data available.
                </div>
              ) : <Skeleton className="w-full h-[300px]" />}
            </CardContent>
          </Card>
       </div>
       <Card className="w-full">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Lightbulb className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Financial Snapshot</CardTitle>
              <CardDescription>A summary of your financial activity for the selected period.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isHydrated ? (
              <p className="text-sm text-foreground/90 whitespace-pre-line">{financialSummary}</p>
            ) : <Skeleton className="h-16 w-full" />}
          </CardContent>
        </Card>
    </div>
  );
}
