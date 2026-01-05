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
import { LivestockType, AgriRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type RecordFormProps = {
  livestockType: LivestockType;
  isOpen: boolean;
  onClose: () => void;
  record?: AgriRecord | null;
};

const formSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  revenue: z.coerce.number().min(0, 'Revenue must be a positive number'),
  expenses: z.coerce.number().min(0, 'Expenses must be a positive number'),
  notes: z.string().optional(),
});

export function RecordForm({ livestockType, isOpen, onClose, record }: RecordFormProps) {
  const { dispatch } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: record 
      ? { ...record, date: new Date(record.date) }
      : { revenue: 0, expenses: 0, notes: ''},
  });
  
  useEffect(() => {
    if (isOpen) {
       form.reset(record 
        ? { ...record, date: new Date(record.date) }
        : { revenue: 0, expenses: 0, notes: '', date: new Date()}
      );
    }
  }, [isOpen, record, form]);

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = (data) => {
    const recordData = {
      ...data,
      id: record ? record.id : new Date().toISOString() + Math.random(),
      date: data.date.toISOString(),
      type: livestockType,
    };
    
    if (record) {
      dispatch({ type: 'UPDATE_RECORD', payload: recordData as AgriRecord });
      toast({ title: 'Record Updated', description: 'Your record has been successfully updated.' });
    } else {
      dispatch({ type: 'ADD_RECORD', payload: recordData as AgriRecord });
      toast({ title: 'Record Added', description: 'A new record has been created.' });
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{record ? 'Edit' : 'Add'} {livestockType === 'dairy' ? 'Dairy' : 'Poultry'} Record</SheetTitle>
            </SheetHeader>
            <div className="flex-1 py-6 space-y-4">
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
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
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
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="expenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expenses</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes about the record" {...field} />
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
              <Button type="submit">Save Record</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
