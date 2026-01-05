'use client';
import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useAppContext } from '@/contexts/app-context';
import { LivestockType, AgriTransaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RecordFormProps = {
  livestockType: LivestockType;
  isOpen: boolean;
  onClose: () => void;
  transaction?: AgriTransaction | null;
};

const formSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  transactionType: z.enum(['income', 'expense'], { required_error: 'Please select a transaction type.'}),
  category: z.string().min(1, 'Category is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  description: z.string().optional(),
});


const dairyIncomeCategories = ['Milk Sales', 'Livestock Sales', 'Government Subsidy', 'Other'];
const poultryIncomeCategories = ['Egg Sales', 'Meat Sales', 'Livestock Sales', 'Other'];
const expenseCategories = ['Feed', 'Veterinary', 'Labor', 'Utilities', 'Maintenance', 'Rent/Mortgage', 'Other'];

export function RecordForm({ livestockType, isOpen, onClose, transaction }: RecordFormProps) {
  const { dispatch } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: transaction
      ? { ...transaction, date: new Date(transaction.date) }
      : { transactionType: 'expense', amount: 0, description: '' },
  });

  const transactionType = form.watch('transactionType');

  const incomeCategories = livestockType === 'poultry' ? poultryIncomeCategories : dairyIncomeCategories;
  const categories = transactionType === 'income' ? incomeCategories : expenseCategories;
  
  useEffect(() => {
    if (isOpen) {
       form.reset(transaction
        ? { ...transaction, date: new Date(transaction.date) }
        : { transactionType: 'expense', amount: 0, description: '', date: new Date() }
      );
    }
  }, [isOpen, transaction, form]);

  useEffect(() => {
    // Reset category if it's not in the new list of categories
    if (!categories.includes(form.getValues('category'))) {
      form.setValue('category', '');
    }
  }, [transactionType, form, categories, livestockType]);

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = (data) => {
    const transactionData = {
      ...data,
      id: transaction ? transaction.id : new Date().toISOString() + Math.random(),
      date: data.date.toISOString(),
      livestockType: livestockType,
      description: data.description || '',
    };
    
    if (transaction) {
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transactionData as AgriTransaction });
      toast({ title: 'Transaction Updated', description: 'Your transaction has been successfully updated.' });
    } else {
      dispatch({ type: 'ADD_TRANSACTION', payload: transactionData as AgriTransaction });
      toast({ title: 'Transaction Added', description: 'A new transaction has been created.' });
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{transaction ? 'Edit' : 'Add'} Transaction</SheetTitle>
            </SheetHeader>
            <div className="flex-1 py-6 space-y-4">
               <FormField
                  control={form.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Transaction Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="income" />
                            </FormControl>
                            <FormLabel className="font-normal">Income</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="expense" />
                            </FormControl>
                            <FormLabel className="font-normal">Expense</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="E.g., Sale of 50L of milk" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit">Save Transaction</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
