'use client';
import { useState, useMemo } from 'react';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Droplets, Egg, Pill, Plus, Search, Utensils } from 'lucide-react';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { RecordForm } from './record-form';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isYesterday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

function formatCurrency(amount: number, currency: string) {
    return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const categoryIcons: { [key: string]: React.ElementType } = {
    'Milk Sales': Droplets,
    'Egg Sales': Egg,
    'Feed': Utensils,
    'Veterinary': Pill,
    'Livestock Sales': Plus,
    'default': Plus
}

export default function FinancesPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;

  const { getTransactions, settings } = useAppContext();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AgriTransaction | null>(null);
  const [timeFilter, setTimeFilter] = useState<'month' | 'week' | 'all'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }

  const allTransactions = getTransactions(livestockType);

  const filteredByTime = useMemo(() => {
    const now = new Date();
    let fromDate: Date, toDate: Date;
    
    if (timeFilter === 'week') {
        fromDate = startOfWeek(now);
        toDate = endOfWeek(now);
    } else if (timeFilter === 'month') { // month
        fromDate = startOfMonth(now);
        toDate = endOfMonth(now);
    } else { // 'all'
        return allTransactions;
    }
    
    return allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= fromDate && transactionDate <= toDate;
    });
  }, [allTransactions, timeFilter]);

  const filteredTransactions = useMemo(() => {
    let transactions = filteredByTime;

    if (categoryFilter !== 'All') {
        transactions = transactions.filter(t => t.category === categoryFilter);
    }

    if (timeFilter === 'all' && searchQuery.trim() !== '') {
        const lowercasedQuery = searchQuery.toLowerCase();
        transactions = transactions.filter(t =>
            t.description.toLowerCase().includes(lowercasedQuery) ||
            t.category.toLowerCase().includes(lowercasedQuery)
        );
    }

    return transactions;
  }, [filteredByTime, categoryFilter, searchQuery, timeFilter]);
  
  const { totalBalance, totalIncome, totalExpenses } = useMemo(() => {
    // Totals should reflect the time filter (month/week) but not the category/search filter
    const income = filteredByTime.reduce((acc, t) => t.transactionType === 'income' ? acc + t.amount : acc, 0);
    const expenses = filteredByTime.reduce((acc, t) => t.transactionType === 'expense' ? acc + t.amount : acc, 0);
    return {
        totalIncome: income,
        totalExpenses: expenses,
        totalBalance: income - expenses,
    }
  }, [filteredByTime]);
  
  const categories = useMemo(() => {
     const uniqueCategories = [...new Set(filteredByTime.map(t => t.category))];
     return ['All', ...uniqueCategories];
  }, [filteredByTime]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: AgriTransaction[] } = {};
    const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sorted.forEach(t => {
        const date = parseISO(t.date);
        let key = '';
        if (timeFilter !== 'all') {
            if (isToday(date)) key = 'Today';
            else if (isYesterday(date)) key = 'Yesterday';
            else key = format(date, 'MMMM d, yyyy');
        } else {
            key = format(date, 'MMMM d, yyyy');
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
    });
    return groups;
  }, [filteredTransactions, timeFilter]);


  const handleEdit = (transaction: AgriTransaction) => {
    setSelectedTransaction(transaction);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setSelectedTransaction(null);
  }
  
  const TransactionItem = ({ transaction }: { transaction: AgriTransaction }) => {
    const Icon = categoryIcons[transaction.category] || categoryIcons.default;
    const isIncome = transaction.transactionType === 'income';

    return (
        <Card onClick={() => handleEdit(transaction)} className="w-full shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-3 flex items-center gap-4">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    isIncome ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                )}>
                    <Icon className={cn("h-5 w-5", isIncome ? 'text-green-600' : 'text-red-600')} />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-foreground">{transaction.description || transaction.category}</p>
                    <p className="text-sm text-muted-foreground">{transaction.category}</p>
                </div>
                <div className={cn("font-bold", isIncome ? 'text-green-600' : 'text-red-600')}>
                    {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, settings.currency)}
                </div>
            </CardContent>
        </Card>
    );
  };


  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Total Balance {timeFilter !== 'all' ? `(This ${timeFilter})` : `(All Time)`}</p>
            <h2 className="text-4xl font-bold">{formatCurrency(totalBalance, settings.currency)}</h2>
        </div>

        <div className="flex justify-center p-1 bg-muted rounded-full">
            <Button
                onClick={() => setTimeFilter('month')}
                variant={timeFilter === 'month' ? 'default' : 'ghost'}
                className="w-1/3 rounded-full"
            >
                This Month
            </Button>
            <Button
                onClick={() => setTimeFilter('week')}
                variant={timeFilter === 'week' ? 'default' : 'ghost'}
                className="w-1/3 rounded-full"
            >
                This Week
            </Button>
            <Button
                onClick={() => setTimeFilter('all')}
                variant={timeFilter === 'all' ? 'default' : 'ghost'}
                className="w-1/3 rounded-full"
            >
                All Time
            </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="p-2 bg-green-100 rounded-full dark:bg-green-900/50">
                        <ArrowDown className="h-4 w-4 text-green-600"/>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Income</p>
                        <p className="font-bold text-lg break-all">+{formatCurrency(totalIncome, settings.currency)}</p>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="p-2 bg-red-100 rounded-full dark:bg-red-900/50">
                        <ArrowUp className="h-4 w-4 text-red-600"/>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Expense</p>
                        <p className="font-bold text-lg break-all">-{formatCurrency(totalExpenses, settings.currency)}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        {timeFilter === 'all' && (
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search transactions..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        )}

        <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            {categories.map(cat => (
                <Button
                    key={cat}
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full flex-shrink-0"
                    onClick={() => setCategoryFilter(cat)}
                >
                    {cat}
                </Button>
            ))}
        </div>

        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            {Object.keys(groupedTransactions).length > 0 ? (
                Object.entries(groupedTransactions).map(([dateGroup, transactions]) => (
                    <div key={dateGroup} className="space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{dateGroup}</p>
                        <div className="space-y-3">
                            {transactions.map(t => <TransactionItem key={t.id} transaction={t} />)}
                        </div>
                    </div>
                ))
            ) : (
                 <div className="text-center py-12">
                    <p className="text-muted-foreground">No transactions for this period or filter.</p>
                </div>
            )}
        </div>

        <RecordForm 
            livestockType={livestockType}
            isOpen={isFormOpen}
            onClose={closeForm}
            transaction={selectedTransaction}
        />
    </div>
  );
}
