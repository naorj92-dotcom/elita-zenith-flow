import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Staff, TimeClock } from '@/types';
import { Pencil, Save, Trash2, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface EditTeamHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: Staff[];
}

export function EditTeamHoursDialog({ open, onOpenChange, staffList }: EditTeamHoursDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [timeEntries, setTimeEntries] = useState<TimeClock[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ clock_in: string; clock_out: string; break_minutes: number }>({
    clock_in: '', clock_out: '', break_minutes: 0,
  });

  // Salary editing
  const [salaryEdits, setSalaryEdits] = useState<Record<string, { hourly_rate: string; saving: boolean }>>({});

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);

  useEffect(() => {
    if (selectedStaffId && open) fetchEntries();
  }, [selectedStaffId, open]);

  const fetchEntries = async () => {
    setLoading(true);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data, error } = await supabase
      .from('time_clock')
      .select('*')
      .eq('staff_id', selectedStaffId)
      .gte('clock_in', fourWeeksAgo.toISOString())
      .order('clock_in', { ascending: false });

    if (!error && data) setTimeEntries(data as TimeClock[]);
    setLoading(false);
  };

  const startEditing = (entry: TimeClock) => {
    setEditingEntry(entry.id);
    setEditValues({
      clock_in: entry.clock_in.slice(0, 16), // datetime-local format
      clock_out: entry.clock_out ? entry.clock_out.slice(0, 16) : '',
      break_minutes: entry.break_minutes,
    });
  };

  const saveEntry = async (entryId: string) => {
    const updateData: any = {
      clock_in: new Date(editValues.clock_in).toISOString(),
      break_minutes: editValues.break_minutes,
    };
    if (editValues.clock_out) {
      updateData.clock_out = new Date(editValues.clock_out).toISOString();
    }

    const { error } = await supabase
      .from('time_clock')
      .update(updateData)
      .eq('id', entryId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Entry Updated', description: 'Time entry has been saved.' });
      setEditingEntry(null);
      fetchEntries();
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  };

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase.from('time_clock').delete().eq('id', entryId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Entry Deleted' });
      fetchEntries();
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  };

  const addManualEntry = async () => {
    if (!selectedStaffId) return;
    const now = new Date();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    const { error } = await supabase.from('time_clock').insert({
      staff_id: selectedStaffId,
      clock_in: eightHoursAgo.toISOString(),
      clock_out: now.toISOString(),
      break_minutes: 0,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Entry Added', description: 'A new time entry has been created. Edit it as needed.' });
      fetchEntries();
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }
  };

  const saveSalary = async (staffId: string) => {
    const edit = salaryEdits[staffId];
    if (!edit) return;

    setSalaryEdits(prev => ({ ...prev, [staffId]: { ...prev[staffId], saving: true } }));

    const { error } = await supabase
      .from('staff')
      .update({ hourly_rate: parseFloat(edit.hourly_rate) })
      .eq('id', staffId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salary Updated' });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    }

    setSalaryEdits(prev => {
      const next = { ...prev };
      delete next[staffId];
      return next;
    });
  };

  const calcHours = (entry: TimeClock) => {
    if (!entry.clock_out) return '—';
    const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
    const hrs = (ms / (1000 * 60 * 60)) - (entry.break_minutes / 60);
    return Math.max(0, hrs).toFixed(2) + 'h';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Edit Team Hours & Salary</DialogTitle>
          <DialogDescription>Modify time clock entries and hourly rates for your team.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="hours" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hours">Edit Hours</TabsTrigger>
            <TabsTrigger value="salary">Edit Salary</TabsTrigger>
          </TabsList>

          {/* ===== HOURS TAB ===== */}
          <TabsContent value="hours" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStaffId && (
                <Button size="sm" variant="outline" onClick={addManualEntry}>
                  <Plus className="h-4 w-4 mr-1" /> Add Entry
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : timeEntries.length === 0 && selectedStaffId ? (
              <p className="text-center text-muted-foreground py-6">No entries in the last 4 weeks.</p>
            ) : timeEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map(entry => (
                    <TableRow key={entry.id}>
                      {editingEntry === entry.id ? (
                        <>
                          <TableCell colSpan={1}>
                            {format(new Date(entry.clock_in), 'MMM d')}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="datetime-local"
                              value={editValues.clock_in}
                              onChange={e => setEditValues(v => ({ ...v, clock_in: e.target.value }))}
                              className="w-auto text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="datetime-local"
                              value={editValues.clock_out}
                              onChange={e => setEditValues(v => ({ ...v, clock_out: e.target.value }))}
                              className="w-auto text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={editValues.break_minutes}
                              onChange={e => setEditValues(v => ({ ...v, break_minutes: parseInt(e.target.value) || 0 }))}
                              className="w-16 text-xs"
                            />
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => saveEntry(entry.id)}>
                              <Save className="h-4 w-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingEntry(null)}>
                              ✕
                            </Button>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{format(new Date(entry.clock_in), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{format(new Date(entry.clock_in), 'h:mm a')}</TableCell>
                          <TableCell>{entry.clock_out ? format(new Date(entry.clock_out), 'h:mm a') : '—'}</TableCell>
                          <TableCell>{entry.break_minutes}m</TableCell>
                          <TableCell className="text-right font-medium">{calcHours(entry)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => startEditing(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </TabsContent>

          {/* ===== SALARY TAB ===== */}
          <TabsContent value="salary" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Hourly Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map(s => {
                  const isEditing = salaryEdits[s.id] !== undefined;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{s.role.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={salaryEdits[s.id].hourly_rate}
                            onChange={e => setSalaryEdits(prev => ({
                              ...prev,
                              [s.id]: { ...prev[s.id], hourly_rate: e.target.value },
                            }))}
                            className="w-24 ml-auto text-right"
                          />
                        ) : (
                          <span>${s.hourly_rate.toFixed(2)}/hr</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              onClick={() => saveSalary(s.id)}
                              disabled={salaryEdits[s.id]?.saving}
                            >
                              {salaryEdits[s.id]?.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setSalaryEdits(prev => { const n = { ...prev }; delete n[s.id]; return n; });
                            }}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => {
                            setSalaryEdits(prev => ({ ...prev, [s.id]: { hourly_rate: s.hourly_rate.toString(), saving: false } }));
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
