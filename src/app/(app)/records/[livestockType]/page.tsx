'use client';
import { useState, useMemo } from 'react';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Download, X } from 'lucide-react';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { RecordForm } from './record-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RecordsPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;

  const { getTransactions, dispatch, settings } = useAppContext();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AgriTransaction | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }

  const title = livestockType === 'dairy' ? 'Dairy Transactions' : 'Poultry Transactions';
  const allTransactions = getTransactions(livestockType);

  const filteredTransactions = useMemo(() => {
    const sorted = allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (startDate) {
        const parsedFrom = parseISO(startDate);
        if (isValid(parsedFrom)) fromDate = startOfDay(parsedFrom);
    }
    if (endDate) {
        const parsedTo = parseISO(endDate);
        if (isValid(parsedTo)) toDate = endOfDay(parsedTo);
    }
    
    if (fromDate || toDate) {
        return sorted.filter(t => {
            const transactionDate = new Date(t.date);
            if (fromDate && !toDate) return transactionDate >= fromDate;
            if (!fromDate && toDate) return transactionDate <= toDate;
            if(fromDate && toDate) return transactionDate >= fromDate && transactionDate <= toDate;
            return false;
        });
    }

    return sorted;
  }, [allTransactions, startDate, endDate]);


  const handleEdit = (transaction: AgriTransaction) => {
    setSelectedTransaction(transaction);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    toast({ title: 'Transaction Deleted', description: 'The transaction has been successfully removed.' });
  };
  
  const closeForm = () => {
    setFormOpen(false);
    setSelectedTransaction(null);
  }

  const generateCSV = () => {
    if (filteredTransactions.length === 0) {
        toast({
            variant: "destructive",
            title: "No Data to Export",
            description: "There are no transactions in the selected date range.",
        });
        return;
    }
    const headers = Object.keys(filteredTransactions[0] || {}).join(',');
    const csv = [
      headers,
      ...filteredTransactions.map(row =>
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
    link.setAttribute('download', `${livestockType}-records-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const clearFilter = () => {
      setStartDate('');
      setEndDate('');
  }

  const Actions = ({transaction}: {transaction: AgriTransaction}) => (
    <>
      <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(transaction.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <Card>
          <CardHeader className="flex-col items-start gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                  Manage and filter your financial transactions here.
              </CardDescription>
            </div>
            <div className="w-full flex flex-col sm:flex-row items-center gap-4">
               <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                 <div className="grid w-full gap-1.5">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                 </div>
                 <div className="grid w-full gap-1.5">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                 </div>
               </div>
                <div className="flex self-end gap-2">
                    {(startDate || endDate) && (
                        <Button onClick={clearFilter} variant="ghost" size="icon">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Clear Filter</span>
                        </Button>
                    )}
                    <Button onClick={generateCSV} disabled={filteredTransactions.length === 0} variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Export Filtered</span>
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden">
                    <div className="space-y-4">
                      {filteredTransactions.map(t => (
                        <Card key={t.id} className="w-full">
                           <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                                <p className="font-semibold">{t.description || "Transaction"}</p>
                                <p className="text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
                                 <Badge variant="outline" className="mt-2">{t.category}</Badge>
                            </div>
                            <div className="text-right">
                                <div className={`text-lg font-bold ${t.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.transactionType === 'income' ? '+' : '-'}
                                    {settings.currency}{t.amount.toFixed(2)}
                                </div>
                                <div className="mt-2">
                                    <Actions transaction={t} />
                                </div>
                            </div>
                           </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-medium">{t.description}</TableCell>
                                    <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                                    <TableCell className={`text-right font-semibold ${t.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.transactionType === 'income' ? '+' : '-'}
                                        {settings.currency} {t.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                       <Actions transaction={t} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </div>
                </>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No transactions found for the selected period.</p>
                </div>
            )}
          </CardContent>
        </Card>
        <RecordForm 
            livestockType={livestockType}
            isOpen={isFormOpen}
            onClose={closeForm}
            transaction={selectedTransaction}
        />
    </div>
  );
}
