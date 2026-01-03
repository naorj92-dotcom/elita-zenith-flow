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
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Client } from '@/types';

export function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
        <Link to="/clients/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Client
          </Button>
        </Link>
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
                  <Link to="/clients/new">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Client
                    </Button>
                  </Link>
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
    </div>
  );
}
