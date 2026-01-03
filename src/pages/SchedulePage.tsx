import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppointmentWithDetails, AppointmentStatus } from '@/types';

// Mock appointments data
const mockAppointments: AppointmentWithDetails[] = [
  {
    id: '1',
    client_id: '1',
    staff_id: '1',
    service_id: '1',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    status: 'confirmed',
    notes: '',
    consent_signed: true,
    intake_completed: true,
    created_at: new Date().toISOString(),
    client_name: 'Jennifer Adams',
    client_email: 'jennifer@email.com',
    staff_name: 'Dr. Sarah Mitchell',
    service_name: 'Botox Treatment',
    service_price: 450,
    duration_minutes: 45,
    room_name: 'Suite A',
  },
  {
    id: '2',
    client_id: '2',
    staff_id: '1',
    service_id: '2',
    date: new Date().toISOString().split('T')[0],
    start_time: '11:30',
    status: 'scheduled',
    notes: '',
    consent_signed: false,
    intake_completed: false,
    created_at: new Date().toISOString(),
    client_name: 'Maria Santos',
    client_email: 'maria@email.com',
    staff_name: 'Dr. Sarah Mitchell',
    service_name: 'HydraFacial',
    service_price: 250,
    duration_minutes: 60,
    room_name: 'Suite B',
  },
  {
    id: '3',
    client_id: '3',
    staff_id: '2',
    service_id: '3',
    date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    status: 'scheduled',
    notes: '',
    consent_signed: false,
    intake_completed: true,
    created_at: new Date().toISOString(),
    client_name: 'Lisa Chen',
    client_email: 'lisa@email.com',
    staff_name: 'Emma Rodriguez',
    service_name: 'Laser Hair Removal',
    service_price: 350,
    duration_minutes: 30,
    room_name: 'Suite C',
  },
  {
    id: '4',
    client_id: '4',
    staff_id: '1',
    service_id: '4',
    date: new Date().toISOString().split('T')[0],
    start_time: '15:30',
    status: 'confirmed',
    notes: 'First time client',
    consent_signed: true,
    intake_completed: true,
    created_at: new Date().toISOString(),
    client_name: 'Amanda Williams',
    client_email: 'amanda@email.com',
    staff_name: 'Dr. Sarah Mitchell',
    service_name: 'Dermal Fillers',
    service_price: 650,
    duration_minutes: 60,
    room_name: 'Suite A',
  },
];

const getStatusStyle = (status: AppointmentStatus): string => {
  const styles: Record<AppointmentStatus, string> = {
    scheduled: 'bg-warning/10 text-warning border-warning/20',
    confirmed: 'bg-success/10 text-success border-success/20',
    checked_in: 'bg-info/10 text-info border-info/20',
    in_progress: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-elita-sage/10 text-elita-sage-dark border-elita-sage/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    no_show: 'bg-muted text-muted-foreground border-border',
  };
  return styles[status] || styles.scheduled;
};

export function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
    });
  };

  const goToPrevDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Generate week days for week selector
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="font-heading text-3xl text-foreground mb-1">Schedule</h1>
          <p className="text-muted-foreground">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Link to="/schedule/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Appointment
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Week Day Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="card-luxury">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevDay}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <div className="flex-1 flex gap-1 overflow-x-auto pb-1">
                {getWeekDays().map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex-1 min-w-[60px] py-3 px-2 rounded-xl text-center transition-all",
                      isSelected(day)
                        ? "bg-primary text-primary-foreground shadow-luxury-sm"
                        : isToday(day)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary text-foreground"
                    )}
                  >
                    <p className="text-xs font-medium opacity-70">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-semibold">{day.getDate()}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={goToNextDay}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appointments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="card-luxury">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-xl">
                Appointments for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {mockAppointments.length} appointments
                </span>
                <Button variant="ghost" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {mockAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-xl text-foreground mb-2">No appointments</h3>
                <p className="text-muted-foreground mb-6">There are no appointments scheduled for this day.</p>
                <Link to="/schedule/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Schedule Appointment
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {mockAppointments.map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <Link
                      to={`/schedule/${apt.id}`}
                      className="flex items-start gap-4 p-5 hover:bg-secondary/50 transition-colors group"
                    >
                      {/* Time Column */}
                      <div className="text-center min-w-[70px]">
                        <p className="text-lg font-semibold text-foreground">
                          {apt.start_time}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.duration_minutes} min
                        </p>
                      </div>

                      {/* Vertical Line */}
                      <div className="w-px bg-border self-stretch" />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {apt.client_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{apt.service_name}</p>
                          </div>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium capitalize border",
                            getStatusStyle(apt.status)
                          )}>
                            {apt.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {apt.staff_name}
                          </span>
                          {apt.room_name && (
                            <span>Room: {apt.room_name}</span>
                          )}
                          <span className="font-medium text-foreground">
                            ${apt.service_price}
                          </span>
                        </div>
                        {/* Status Indicators */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            apt.consent_signed 
                              ? "bg-success/10 text-success" 
                              : "bg-warning/10 text-warning"
                          )}>
                            {apt.consent_signed ? '✓ Consent' : 'Consent Needed'}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            apt.intake_completed 
                              ? "bg-success/10 text-success" 
                              : "bg-warning/10 text-warning"
                          )}>
                            {apt.intake_completed ? '✓ Intake' : 'Intake Needed'}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
