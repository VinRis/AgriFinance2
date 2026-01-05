'use client';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { DollarSign, TrendingUp, TrendingDown, BookOpen, Lightbulb, Filter, Target } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Pie, PieChart, Cell, Legend } from 'recharts';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { sub, startOfYear, startOfMonth, endOfMonth, endOfYear } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface AggregatedData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  barChartData: { date: string; revenue: number; expenses: number }[];
  pieChartData: { name: string; value: number }[];
}

function formatCurrency(amount: number, currency: string) {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function aggregateData(transactions: AgriTransaction[]): AggregatedData {
    if (!transactions) {
        return { totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalTransactions: 0, barChartData: [], pieChartData: [] };
    }
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
  let summary = `You've logged ${data.totalTransactions} transactions. Your total income is ${formatCurrency(totalRevenue, currency)} and total expenses are ${formatCurrency(totalExpenses, currency)}, resulting in a net profit of ${formatCurrency(netProfit, currency)}. `;

  if (pieChartData.length > 0) {
    const highestExpenseCategory = pieChartData.reduce((max, cat) => cat.value > max.value ? cat : max);
    summary += `Your largest expense category is "${highestExpenseCategory.name}" at ${formatCurrency(highestExpenseCategory.value, currency)}. `;
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
  
  const [filterType, setFilterType] = useState('month');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }
  
  const allTransactions = getTransactions(livestockType);

  const { currentPeriodTransactions, previousPeriodTransactions } = useMemo(() => {
    if (!isHydrated) return { currentPeriodTransactions: [], previousPeriodTransactions: [] };

    const getPeriodTransactions = (type: string, year: number, month: number) => {
        let fromDate: Date, toDate: Date;
        const now = new Date();

        switch (type) {
            case 'ytd':
                fromDate = startOfYear(now);
                toDate = now;
                break;
            case 'year':
                fromDate = startOfYear(new Date(year, 0, 1));
                toDate = endOfYear(new Date(year, 11, 31));
                break;
            case 'month':
                fromDate = startOfMonth(new Date(year, month));
                toDate = endOfMonth(new Date(year, month));
                break;
            case 'all':
            default:
                return allTransactions;
        }

        return allTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= fromDate && transactionDate <= toDate;
        });
    };
    
    const getPreviousPeriodDates = (type: string, year: number, month: number) => {
        let prevYear = year;
        let prevMonth = month;

        switch (type) {
             case 'ytd':
                 // Previous YTD is all of last year for simplicity
                prevYear = year - 1;
                return { type: 'year', year: prevYear, month: prevMonth };
            case 'year':
                prevYear = year - 1;
                return { type: 'year', year: prevYear, month: prevMonth };
            case 'month':
                const currentMonthDate = new Date(year, month);
                const prevMonthDate = sub(currentMonthDate, { months: 1 });
                prevYear = prevMonthDate.getFullYear();
                prevMonth = prevMonthDate.getMonth();
                return { type: 'month', year: prevYear, month: prevMonth };
            default:
                 return { type: 'all', year: year, month: month };
        }
    };
    
    const currentPeriodTransactions = getPeriodTransactions(filterType, selectedYear, selectedMonth);
    const { type: prevType, year: prevYear, month: prevMonth } = getPreviousPeriodDates(filterType, selectedYear, selectedMonth);
    const previousPeriodTransactions = getPeriodTransactions(prevType, prevYear, prevMonth);


    return { currentPeriodTransactions, previousPeriodTransactions };
  }, [allTransactions, filterType, selectedYear, selectedMonth, isHydrated]);


  const aggregatedData = aggregateData(currentPeriodTransactions);
  const prevAggregatedData = aggregateData(previousPeriodTransactions);

  const { totalRevenue, totalExpenses, netProfit, totalTransactions, barChartData, pieChartData } = aggregatedData;
  const financialSummary = generateFinancialSummary(aggregatedData, settings.currency);

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };
  
  const KPICard = ({ title, value, icon: Icon, description, currentValue, previousValue, isCurrency = true }: { title: string; value: string; icon: React.ElementType, description: string; currentValue: number; previousValue: number; isCurrency?: boolean; }) => {
    const percentageChange = calculatePercentageChange(currentValue, previousValue);
    const changeText = isFinite(percentageChange) ? `${percentageChange.toFixed(1)}% from last period` : "vs. N/A";
    const changeColor = percentageChange >= 0 ? 'text-green-600' : 'text-red-600';

    return (
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
                {filterType !== 'all' && (
                  <p className={`text-xs ${changeColor} mt-1`}>
                    {percentageChange >= 0 ? '▲' : '▼'} {changeText}
                  </p>
                )}
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full mt-1" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </>
            )}
          </CardContent>
        </Card>
    );
  };

  const COLORS = useMemo(() => [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--accent))',
  ], []);
  
  const getFilterLabel = () => {
    switch (filterType) {
      case 'all': return 'All Time';
      case 'ytd': return 'Year to Date';
      case 'year': return `Year: ${selectedYear}`;
      case 'month': return `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
      default: return 'Filter';
    }
  }

  const breakevenProgress = totalExpenses > 0 ? (totalRevenue / totalExpenses) * 100 : 0;

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Hello, {isHydrated ? settings.managerName.split(' ')[0] : '...'}!</h2>
                <p className="text-muted-foreground">Here's your financial overview.</p>
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline">
                        <Filter className="mr-2 h-4 w-4" />
                        {getFilterLabel()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filters</h4>
                            <p className="text-sm text-muted-foreground">
                                Select a time period to view data.
                            </p>
                        </div>
                        <div className="grid gap-2">
                           <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filter-type">Period</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger id="filter-type" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Filter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Time</SelectItem>
                                        <SelectItem value="ytd">Year to Date</SelectItem>
                                        <SelectItem value="year">By Year</SelectItem>
                                        <SelectItem value="month">By Month</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             {filterType === 'year' && (
                               <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="year-select">Year</Label>
                                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                                        <SelectTrigger id="year-select" className="col-span-2 h-8">
                                            <SelectValue placeholder="Select Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                               </div>
                            )}
                            {filterType === 'month' && (
                                <>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="month-year-select">Year</Label>
                                         <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                                            <SelectTrigger id="month-year-select" className="col-span-2 h-8">
                                                <SelectValue placeholder="Select Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="month-select">Month</Label>
                                        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                                            <SelectTrigger id="month-select" className="col-span-2 h-8">
                                                <SelectValue placeholder="Select Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>


       <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <KPICard
                title="Total Revenue"
                value={formatCurrency(totalRevenue, settings.currency)}
                icon={DollarSign}
                description="Total income from sales."
                currentValue={totalRevenue}
                previousValue={prevAggregatedData.totalRevenue}
            />
             <KPICard
                title="Total Expenses"
                value={formatCurrency(totalExpenses, settings.currency)}
                icon={DollarSign}
                description="Total expenses incurred."
                currentValue={totalExpenses}
                previousValue={prevAggregatedData.totalExpenses}
            />
            <KPICard
                title="Net Profit"
                value={formatCurrency(netProfit, settings.currency)}
                icon={netProfit >= 0 ? TrendingUp : TrendingDown}
                description="Profit after expenses."
                currentValue={netProfit}
                previousValue={prevAggregatedData.netProfit}
            />
            <KPICard
                title="Transactions"
                value={totalTransactions.toLocaleString('en-US')}
                icon={BookOpen}
                description="Total number of entries."
                currentValue={totalTransactions}
                previousValue={prevAggregatedData.totalTransactions}
                isCurrency={false}
            />
       </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Breakeven Analysis</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isHydrated ? (
                <>
                    <div className="text-xl font-bold">{formatCurrency(totalExpenses, settings.currency)}</div>
                    <p className="text-xs text-muted-foreground">This is your breakeven point (total expenses).</p>
                    <Progress value={breakevenProgress} className="w-full mt-3 h-2" />
                    <p className="text-sm mt-2 text-foreground/90">
                        {netProfit >= 0
                            ? `You've surpassed your breakeven point by ${formatCurrency(netProfit, settings.currency)}.`
                            : `You need to earn ${formatCurrency(-netProfit, settings.currency)} more to break even.`}
                    </p>
                </>
            ) : (
                <>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full mt-1" />
                    <Skeleton className="h-2 w-full mt-3" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </>
            )}
        </CardContent>
      </Card>


       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
              <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                  <CardDescription>A summary of income and expenses. Bar chart shows last 30 days of selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                  {isHydrated && currentPeriodTransactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${settings.currency}${value.toLocaleString('en-US')}`} />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', radius: 'var(--radius)'}}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: 'var(--radius)',
                              boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)'
                            }}
                            formatter={(value: number) => formatCurrency(value, settings.currency)}
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
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--background))" style={{filter: `drop-shadow(0 2px 4px hsl(var(--foreground) / 0.1))`}}/>
                      ))}
                    </Pie>
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                          boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)'
                        }}
                        formatter={(value: number) => formatCurrency(value, settings.currency)}
                    />
                    <Legend iconSize={12} iconType="circle" />
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

    