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
import { FarmTask, LivestockType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Bird, Milk, Wrench, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type TaskFormProps = {
  isOpen: boolean;
  onClose: () => void;
  task?: FarmTask | null;
  selectedDate?: Date;
};

const formSchema = z.object({
  date: z.string().min(1, 'A date is required.'),
  time: z.string().min(1, 'A time is required.'),
  title: z.string().min(1, 'Title is required.'),
  livestockType: z.enum(['dairy', 'poultry', 'general'], { required_error: 'Please select a category.'}),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});


export function TaskForm({ isOpen, onClose, task, selectedDate }: TaskFormProps) {
  const { dispatch } = useAppContext();
  const { toast } = useToast();

  const getDefaultDate = () => {
    if (task) return new Date(task.date).toISOString().split('T')[0];
    if (selectedDate) return selectedDate.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  }
  
  const getDefaultTime = () => {
    if (task) return task.time;
    // Format current time as HH:mm
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: task
      ? { ...task, date: new Date(task.date).toISOString().split('T')[0] }
      : { livestockType: 'general', title: '', description: '', date: getDefaultDate(), time: getDefaultTime(), priority: 'medium' },
  });

  useEffect(() => {
    if (isOpen) {
       form.reset(task
        ? { ...task, date: new Date(task.date).toISOString().split('T')[0] }
        : { livestockType: 'general', title: '', description: '', date: getDefaultDate(), time: getDefaultTime(), priority: 'medium' }
      );
    }
  }, [isOpen, task, selectedDate, form]);


  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = (data) => {
    const taskData = {
      ...data,
      id: task ? task.id : new Date().toISOString() + Math.random(),
      date: new Date(data.date).toISOString(),
      status: task ? task.status : 'pending',
      description: data.description || '',
    };
    
    if (task) {
      dispatch({ type: 'UPDATE_TASK', payload: taskData as FarmTask });
      toast({ title: 'Task Updated', description: 'Your task has been successfully updated.' });
    } else {
      dispatch({ type: 'ADD_TASK', payload: taskData as FarmTask });
      toast({ title: 'Task Added', description: 'A new task has been scheduled.' });
    }
    onClose();
  };
  
  const CategoryButton = ({ value, label, icon: Icon }: { value: 'poultry' | 'dairy' | 'general', label: string, icon: React.ElementType }) => (
      <Button
        type="button"
        variant="outline"
        className={cn(
          "flex-1 justify-start h-14",
          form.watch('livestockType') === value && "ring-2 ring-primary border-primary"
        )}
        onClick={() => form.setValue('livestockType', value, { shouldValidate: true })}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span className="text-base font-semibold">{label}</span>
        </div>
      </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{task ? 'Edit' : 'Add'} Task</SheetTitle>
            </SheetHeader>
            <div className="flex-1 py-6 space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Vaccinate herd" {...field} className="text-lg py-6" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="livestockType"
                render={() => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <div className="flex gap-2">
                        <CategoryButton value="poultry" label="Poultry" icon={Bird} />
                        <CategoryButton value="dairy" label="Dairy" icon={Milk} />
                    </div>
                     <div className="flex gap-2">
                        <CategoryButton value="general" label="General" icon={Wrench} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Schedule</FormLabel>
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

               <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="low" /></FormControl>
                          <FormLabel className="font-normal">Low</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="medium" /></FormControl>
                          <FormLabel className="font-normal">Medium</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="high" /></FormControl>
                          <FormLabel className="font-normal flex items-center gap-1"><Siren className="h-4 w-4 text-destructive" /> High</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add more details about the task..." {...field} value={field.value ?? ''} />
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
              <Button type="submit">Save Task</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
