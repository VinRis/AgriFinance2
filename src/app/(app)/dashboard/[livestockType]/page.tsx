'use client';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { DollarSign, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface AggregatedData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  chartData: { date: string; revenue: number; expenses: number }[];
}

function aggregateData(transactions: AgriTransaction[]): AggregatedData {
    const dailyData: { [key: string]: { revenue: number; expenses: number } } = {};

    transactions.forEach(t => {
        const date = new Date(t.date).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = { revenue: 0, expenses: 0 };
        }
        if (t.transactionType === 'income') {
            dailyData[date].revenue += t.amount;
        } else {
            dailyData[date].expenses += t.amount;
        }
    });

    const chartData = Object.entries(dailyData)
        .map(([date, data]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            ...data
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

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
        chartData
    };
}


export default function DashboardPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;
  
  const { getTransactions, settings } = useAppContext();

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }

  const transactions = getTransactions(livestockType);
  const { totalRevenue, totalExpenses, netProfit, totalTransactions, chartData } = aggregateData(transactions);
  
  const KPICard = ({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType, description: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
       <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
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
       <Card>
           <CardHeader>
               <CardTitle>Financial Overview</CardTitle>
               <CardDescription>A summary of income and expenses from the last 30 days.</CardDescription>
           </CardHeader>
           <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                   <BarChart data={chartData}>
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
           </CardContent>
       </Card>
    </div>
  );
}
