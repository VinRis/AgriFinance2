'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ThemeToggle } from '@/components/theme-toggle';
import { LifeBuoy, MessageSquare, Phone } from 'lucide-react';

const settingsSchema = z.object({
  farmName: z.string().min(1, 'Farm name is required'),
  managerName: z.string().min(1, 'Manager name is required'),
  location: z.string().min(1, 'Location is required'),
  currency: z.string().min(1, 'Currency symbol is required'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { settings, dispatch } = useAppContext();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });
  
  const onSubmit: SubmitHandler<SettingsFormValues> = (data) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: data });
    toast({
      title: 'Settings Updated',
      description: 'Your farm settings have been saved successfully.',
    });
  };

  return (
     <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                  Manage your application settings and farm data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="farmName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Farm Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Sunny Meadows Farm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="managerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Green Valley" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., $, €, £" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-medium">Appearance</h3>
                    <p className="text-sm text-muted-foreground">Toggle between light and dark mode.</p>
                  </div>
                  <ThemeToggle />
                </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">Save Changes</Button>
            </CardFooter>
          </Card>
        </form>
       </Form>

        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <LifeBuoy className="h-6 w-6 text-primary" />
                    <div>
                        <CardTitle>Help & Support</CardTitle>
                        <CardDescription>
                            Contact the developer for assistance.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-foreground/90">
                    If you encounter any issues or have questions, please don't hesitate to reach out.
                </p>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <h4 className="font-medium">Phone</h4>
                        <a href="tel:+254732364559" className="text-primary hover:underline">+254732364559</a>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <h4 className="font-medium">WhatsApp</h4>
                        <a href="https://wa.me/254732364559" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+254732364559</a>
                    </div>
                </div>
            </CardContent>
        </Card>
        <div className="text-center text-sm text-muted-foreground">
          Made with 🩷 by KPF
        </div>
    </div>
  );
}
