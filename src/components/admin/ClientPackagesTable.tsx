import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Edit2, Trash2, Plus, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { AssignClientPackageDialog } from './AssignClientPackageDialog';

export function ClientPackagesTable() {
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any>(null);

  const { data: clientPackages, isLoading } = useQuery({
    queryKey: ['client-packages-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_packages')
        .select('*, packages(name, price), clients:client_id(first_name, last_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-packages-admin'] });
      toast.success('Client package removed');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'expired': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client Packages</CardTitle>
          <Button onClick={() => { setEditingPkg(null); setAssignOpen(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Package
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !clientPackages?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No client packages yet. Assign a package to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientPackages.map((cp: any) => {
                  const progress = cp.sessions_total > 0 ? (cp.sessions_used / cp.sessions_total) * 100 : 0;
                  return (
                    <TableRow key={cp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {cp.clients?.first_name} {cp.clients?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{cp.clients?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{cp.packages?.name || '—'}</TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {cp.sessions_used}/{cp.sessions_total} sessions
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(cp.status)}>{cp.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {cp.expiry_date ? format(new Date(cp.expiry_date), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingPkg(cp); setAssignOpen(true); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Client Package?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this package assignment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(cp.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {assignOpen && (
        <AssignClientPackageDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          editingClientPackage={editingPkg}
        />
      )}
    </>
  );
}
