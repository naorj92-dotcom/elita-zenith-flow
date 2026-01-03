import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Activity, DollarSign, Clock, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DateRangeFilter';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MachineROITrackerProps {
  dateRange: DateRange;
}

interface MachinePerformance {
  id: string;
  name: string;
  machineType: string;
  utilizationRate: number;
  revenue: number;
  appointmentCount: number;
  totalMinutesUsed: number;
  needsMaintenance: boolean;
}

export function MachineROITracker({ dateRange }: MachineROITrackerProps) {
  const [machines, setMachines] = useState<MachinePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachinePerformance();
  }, [dateRange]);

  const fetchMachinePerformance = async () => {
    setLoading(true);
    try {
      // Fetch machines
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('*')
        .eq('status', 'active');

      if (machinesError) throw machinesError;

      // Fetch services with machine types
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, machine_type_id, price, duration_minutes');

      if (servicesError) throw servicesError;

      // Fetch appointments in date range
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, service_id, duration_minutes, status, total_amount')
        .gte('scheduled_at', dateRange.startDate.toISOString())
        .lte('scheduled_at', dateRange.endDate.toISOString())
        .in('status', ['completed', 'in_progress']);

      if (appointmentsError) throw appointmentsError;

      // Calculate business hours in range (8 hours per day)
      const daysInRange = Math.ceil(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const businessMinutesAvailable = daysInRange * 8 * 60; // 8 hours per day

      // Map service IDs to machine type IDs
      const serviceToMachineType = new Map(
        servicesData?.map(s => [s.id, s.machine_type_id]) || []
      );

      // Calculate performance for each machine
      const performance: MachinePerformance[] = machinesData?.map(machine => {
        // Find appointments that used services requiring this machine type
        const machineAppointments = appointmentsData?.filter(apt => {
          const machineTypeId = serviceToMachineType.get(apt.service_id);
          return machineTypeId === machine.id;
        }) || [];

        const totalMinutesUsed = machineAppointments.reduce(
          (sum, apt) => sum + (apt.duration_minutes || 0), 0
        );
        const revenue = machineAppointments.reduce(
          (sum, apt) => sum + Number(apt.total_amount || 0), 0
        );
        
        // Utilization rate considering machine quantity
        const totalMachineMinutes = businessMinutesAvailable * (machine.quantity || 1);
        const utilizationRate = totalMachineMinutes > 0 
          ? (totalMinutesUsed / totalMachineMinutes) * 100 
          : 0;

        // Maintenance alert: flag if more than 100 appointments
        const needsMaintenance = machineAppointments.length > 100;

        return {
          id: machine.id,
          name: machine.name,
          machineType: machine.machine_type,
          utilizationRate: Math.min(utilizationRate, 100),
          revenue,
          appointmentCount: machineAppointments.length,
          totalMinutesUsed,
          needsMaintenance
        };
      }) || [];

      setMachines(performance.sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
      console.error('Error fetching machine performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 70) return 'text-success';
    if (rate >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const totalRevenue = machines.reduce((sum, m) => sum + m.revenue, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Machine Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Machines</p>
                <p className="text-2xl font-bold">{machines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <Wrench className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maintenance Alerts</p>
                <p className="text-2xl font-bold">
                  {machines.filter(m => m.needsMaintenance).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Machine Performance
          </CardTitle>
          <CardDescription>
            Utilization rates, revenue, and maintenance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Time Used</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map(machine => (
                <TableRow key={machine.id}>
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{machine.machineType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress 
                        value={machine.utilizationRate} 
                        className="h-2 flex-1"
                      />
                      <span className={`text-sm font-medium ${getUtilizationColor(machine.utilizationRate)}`}>
                        {machine.utilizationRate.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(machine.revenue)}
                  </TableCell>
                  <TableCell className="text-right">{machine.appointmentCount}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDuration(machine.totalMinutesUsed)}
                  </TableCell>
                  <TableCell>
                    {machine.needsMaintenance ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Service Due
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-success border-success/20">
                        Operational
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No machine data available for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
