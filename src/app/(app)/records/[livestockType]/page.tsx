'use client';
import { useState } from 'react';
import { notFound, usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { RecordForm } from './record-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function RecordsPage() {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const livestockType = segments[segments.length - 1] as LivestockType;

  const { getTransactions, dispatch, settings } = useAppContext();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AgriTransaction | null>(null);

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }

  const title = livestockType === 'dairy' ? 'Dairy Transactions' : 'Poultry Transactions';
  const transactions = getTransactions(livestockType).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                  Manage your financial transactions here.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
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
                        {transactions.map(t => (
                            <TableRow key={t.id}>
                                <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">{t.description}</TableCell>
                                <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                                <TableCell className={`text-right font-semibold ${t.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.transactionType === 'income' ? '+' : '-'}
                                    {settings.currency} {t.amount.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
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
                                                onClick={() => handleDelete(t.id)}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No transactions found.</p>
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
