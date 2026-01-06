'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Bird, Milk, Wrench, Siren } from 'lucide-react';
import { FarmTask, LivestockType } from '@/lib/types';
import { useAppContext } from '@/contexts/app-context';
import { TaskForm } from './task-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format, startOfToday, addDays, subDays, isToday, parseISO, getDay, isSameDay, startOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

const getCategoryIcon = (type: LivestockType | 'general') => {
    switch (type) {
        case 'dairy': return <Milk className="h-5 w-5 text-blue-500" />;
        case 'poultry': return <Bird className="h-5 w-5 text-amber-500" />;
        default: return <Wrench className="h-5 w-5 text-gray-500" />;
    }
};

export default function TasksPage() {
  const { getTasks, dispatch } = useAppContext();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<FarmTask | null>(null);
  const [currentDate, setCurrentDate] = useState(startOfToday());
  const dateScrollRef = useRef<HTMLDivElement>(null);
  
  const allTasks = useMemo(() => getTasks().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [getTasks]);
  
  const tasksForDate = useMemo(() => {
    return allTasks.filter(task => isSameDay(parseISO(task.date), currentDate));
  }, [allTasks, currentDate]);

  const { pendingCount, completedCount } = useMemo(() => {
    return tasksForDate.reduce((acc, task) => {
        if(task.status === 'pending') acc.pendingCount++;
        if(task.status === 'completed') acc.completedCount++;
        return acc;
    }, { pendingCount: 0, completedCount: 0 });
  }, [tasksForDate]);

  const { morningTasks, afternoonTasks } = useMemo(() => {
    const morning: FarmTask[] = [];
    const afternoon: FarmTask[] = [];
    tasksForDate.forEach(task => {
      const hour = parseInt(task.time.split(':')[0], 10);
      if (hour < 12) {
        morning.push(task);
      } else {
        afternoon.push(task);
      }
    });
    return { morningTasks: morning, afternoonTasks: afternoon };
  }, [tasksForDate]);
  
  useEffect(() => {
    // Scroll the selected date into view
    const selectedDateElem = document.getElementById(`date-${format(currentDate, 'yyyy-MM-dd')}`);
    if (selectedDateElem && dateScrollRef.current) {
        const scrollContainer = dateScrollRef.current;
        const elementLeft = selectedDateElem.offsetLeft;
        const elementWidth = selectedDateElem.offsetWidth;
        const containerWidth = scrollContainer.offsetWidth;
        const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);
        
        scrollContainer.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
}, [currentDate]);


  const handleEdit = (task: FarmTask) => {
    setSelectedTask(task);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_TASK', payload: id });
    toast({ title: 'Task Deleted', description: 'The task has been successfully removed.' });
  };
  
  const handleStatusChange = (task: FarmTask, completed: boolean) => {
    const updatedTask = { ...task, status: completed ? 'completed' : 'pending' as 'completed' | 'pending' };
    dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
    toast({ title: 'Task Updated', description: `Task marked as ${completed ? 'completed' : 'pending'}.` });
  };

  const closeForm = () => {
    setFormOpen(false);
    setSelectedTask(null);
  }

  const getLivestockTypeColor = (type: LivestockType | 'general') => {
    switch (type) {
        case 'dairy': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'poultry': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const TaskItem = ({ task }: { task: FarmTask }) => {
     const time = task.time ? format(parseISO(`1970-01-01T${task.time}:00`), 'h:mm a') : 'Any time';
     
     return (
        <Card className={cn("w-full transition-all duration-200", task.priority === 'high' && 'border-l-4 border-l-red-500')}>
         <CardContent className="p-3 flex items-center gap-4">
            <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", getLivestockTypeColor(task.livestockType))}>
                {getCategoryIcon(task.livestockType)}
            </div>
            <div className="flex-1">
               <div className="flex items-center">
                    <Label htmlFor={`task-${task.id}`} className={cn("font-semibold", task.status === 'completed' && 'line-through text-muted-foreground')}>
                        {task.title}
                    </Label>
                    {task.priority === 'high' && <Siren className="h-4 w-4 text-red-500 ml-2" />}
               </div>
               <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <span>{time}</span>
                <span className="text-xs">•</span>
                <Badge variant="outline" className={`text-xs font-semibold border-0 ${getLivestockTypeColor(task.livestockType)}`}>{task.livestockType}</Badge>
               </div>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Checkbox
                    id={`task-${task.id}`}
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => handleStatusChange(task, !!checked)}
                    className="h-6 w-6 rounded-md"
                />
                <div className="flex">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(task)}>
                        <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the task.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(task.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
         </CardContent>
       </Card>
     );
  };
  
  const TaskGroup = ({ title, tasks, badgeCount }: { title: string, tasks: FarmTask[], badgeCount?: number }) => {
    if (tasks.length === 0) return null;
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{title}</h3>
                {badgeCount !== undefined && <Badge variant="secondary">{badgeCount} Left</Badge>}
            </div>
            <div className="space-y-3">
                {tasks.map(task => <TaskItem key={task.id} task={task} />)}
            </div>
        </div>
    );
  };

  const DateNavigator = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const weekDates = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const today = startOfToday();

    return (
        <div ref={dateScrollRef} className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            {eachDayOfInterval({ start: subDays(today, 10), end: addDays(today, 10) }).map(day => (
                <button
                    key={day.toString()}
                    id={`date-${format(day, 'yyyy-MM-dd')}`}
                    onClick={() => setCurrentDate(day)}
                    className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl min-w-[60px] transition-colors duration-200",
                        isSameDay(day, currentDate)
                            ? "bg-green-500 text-white"
                            : "bg-card hover:bg-muted"
                    )}
                >
                    <span className="text-xs font-medium uppercase">{format(day, 'E')}</span>
                    <span className="text-lg font-bold">{format(day, 'd')}</span>
                    {allTasks.some(task => isSameDay(parseISO(task.date), day) && task.status === 'pending') && (
                         <div className={cn("h-1.5 w-1.5 rounded-full mt-1", isSameDay(day, currentDate) ? 'bg-white' : 'bg-green-500')}></div>
                    )}
                </button>
            ))}
        </div>
    );
  };


  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
        <DateNavigator />
        
        <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card">
                <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">PENDING</p>
                    <p className="text-3xl font-bold">{pendingCount}</p>
                </CardContent>
            </Card>
            <Card className="bg-card">
                <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">COMPLETED</p>
                    <p className="text-3xl font-bold">{completedCount}</p>
                </CardContent>
            </Card>
        </div>
        
        <div className="space-y-8">
            <TaskGroup title="Morning Tasks" tasks={morningTasks} badgeCount={morningTasks.filter(t => t.status === 'pending').length} />
            <TaskGroup title="Afternoon Tasks" tasks={afternoonTasks} badgeCount={afternoonTasks.filter(t => t.status === 'pending').length} />
        </div>

        {tasksForDate.length === 0 && (
             <div className="text-center py-10 rounded-lg bg-card">
                <p className="text-muted-foreground">No tasks for {isToday(currentDate) ? "today" : format(currentDate, 'MMM d')}.</p>
            </div>
        )}

        <TaskForm 
            isOpen={isFormOpen}
            onClose={closeForm}
            task={selectedTask}
            selectedDate={currentDate}
        />
    </div>
  );
}
