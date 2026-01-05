'use client';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { LivestockType, AgriRecord } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { RecordForm } from './record-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function RecordsPage({ params }: { params: { livestockType: string } }) {
  const { livestockType } = params;
  const { getRecords, dispatch, settings } = useAppContext();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AgriRecord | null>(null);

  if (livestockType !== 'dairy' && livestockType !== 'poultry') {
    notFound();
  }

  const title = livestockType === 'dairy' ? 'Dairy Records' : 'Poultry Records';
  const records = getRecords(livestockType as LivestockType).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAdd = () => {
    setSelectedRecord(null);
    setFormOpen(true);
  };

  const handleEdit = (record: AgriRecord) => {
    setSelectedRecord(record);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_RECORD', payload: id });
    toast({ title: 'Record Deleted', description: 'The record has been successfully removed.' });
  };
  
  const closeForm = () => {
    setFormOpen(false);
    setSelectedRecord(null);
  }

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                  Manage your financial records here.
              </CardDescription>
            </div>
            <Button onClick={handleAdd} size="sm">
                <PlusCircle className="mr-2" />
                Add Record
            </Button>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.map(record => (
                            <TableRow key={record.id}>
                                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">{settings.currency} {record.revenue.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{settings.currency} {record.expenses.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
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
                                                This action cannot be undone. This will permanently delete the record.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(record.id)}
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
                    <p className="text-muted-foreground">No records found.</p>
                    <Button onClick={handleAdd} className="mt-4">
                        <PlusCircle className="mr-2" />
                        Add Your First Record
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
        <RecordForm 
            livestockType={livestockType as LivestockType}
            isOpen={isFormOpen}
            onClose={closeForm}
            record={selectedRecord}
        />
    </div>
  );
}
