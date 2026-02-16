import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Plus, 
  User,
  Phone,
  Mail,
  ChevronRight,
  Crown,
  DollarSign,
  X,
  Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Client } from '@/types';
import { toast } from 'sonner';

export function ClientsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.includes(searchQuery);
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
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
          <h1 className="font-heading text-3xl text-foreground mb-1">Clients</h1>
          <p className="text-muted-foreground">{clients.length} total clients</p>
        </div>
        <Button className="gap-2" onClick={() => setShowNewClient(true)}>
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name, email, or phone..."
            className="pl-12 h-12 bg-card border-border"
          />
        </div>
      </motion.div>

      {/* Clients List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="card-luxury">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-xl text-foreground mb-2">No clients found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? 'Try a different search term' : 'Add your first client to get started'}
                </p>
                {!searchQuery && (
                  <Button className="gap-2" onClick={() => setShowNewClient(true)}>
                    <Plus className="w-4 h-4" />
                    Add Client
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredClients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                  >
                    <Link
                      to={`/clients/${client.id}`}
                      className="flex items-center gap-4 p-5 hover:bg-secondary/50 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                        client.is_vip ? "bg-warning/20" : "bg-primary/10"
                      )}>
                        {client.is_vip ? (
                          <Crown className="w-5 h-5 text-warning" />
                        ) : (
                          <span className="text-primary font-semibold">
                            {getInitials(client.first_name, client.last_name)}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {client.first_name} {client.last_name}
                          </h3>
                          {client.is_vip && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Spent</p>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {Number(client.total_spent).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Visits</p>
                          <p className="text-sm font-semibold text-foreground">{client.visit_count}</p>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* New Client Full-Screen Dialog */}
      {showNewClient && (
        <NewClientOverlay
          onClose={() => setShowNewClient(false)}
          onCreated={(newId) => {
            setShowNewClient(false);
            fetchClients();
            navigate(`/clients/${newId}`);
          }}
        />
      )}
    </div>
  );
}

// ─── New Client Overlay (Boulevard-style) ────────────────
function NewClientOverlay({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from('clients').insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      marketing_opt_in: marketingOptIn ? 'Opted In' : 'Opted Out',
    }).select('id').single();

    setSaving(false);
    if (error) {
      toast.error('Failed to create client');
    } else {
      toast.success('Client created');
      onCreated(data.id);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !firstName.trim() || !lastName.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto flex justify-center pt-12 pb-20 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="font-heading text-3xl text-foreground mb-8">New client</h1>

          <div className="bg-card border border-border rounded-lg p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">First name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 bg-muted/50"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Last name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 bg-muted/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Email address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Phone number</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 bg-muted/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="marketing-opt-in"
                checked={marketingOptIn}
                onCheckedChange={(v) => setMarketingOptIn(!!v)}
              />
              <Label htmlFor="marketing-opt-in" className="text-sm text-foreground cursor-pointer">
                Customer agreed to receive marketing emails.
              </Label>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
