'use client';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { LivestockType } from '@/lib/types';
import { DollarSign, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

function kpiReducer(
  acc: {
    totalRevenue: number;
    totalExpenses: number;
  },
  record: any
) {
  acc.totalRevenue += record.revenue;
  acc.totalExpenses += record.expenses;
  return acc;
}

export default function DashboardPage({ params }: { params: { livestockType: string } }) {
  const { livestockType } = params;
  const { getRecords, settings } = useAppContext();

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }

  const records = getRecords(livestockType as LivestockType);

  const { totalRevenue, totalExpenses } = records.reduce(kpiReducer, {
    totalRevenue: 0,
    totalExpenses: 0,
  });

  const netProfit = totalRevenue - totalExpenses;

  const chartData = records
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: r.revenue,
      expenses: r.expenses,
    })).slice(-30); // Last 30 records


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
                title="Records"
                value={records.length.toString()}
                icon={BookOpen}
                description="Total number of entries."
            />
       </div>
       <Card>
           <CardHeader>
               <CardTitle>Revenue & Expenses Overview</CardTitle>
               <CardDescription>A summary of the last 30 entries.</CardDescription>
           </CardHeader>
           <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                   <BarChart data={chartData}>
                       <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                       <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${settings.currency}${value}`} />
                       <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
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
