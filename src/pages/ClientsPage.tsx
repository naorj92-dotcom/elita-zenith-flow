import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Plus, 
  User,
  Phone,
  Mail,
  ChevronRight,
  Calendar,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Client } from '@/types';

// Mock clients data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Jennifer Adams',
    email: 'jennifer.adams@email.com',
    phone: '(555) 123-4567',
    date_of_birth: '1985-03-15',
    notes: 'Prefers morning appointments',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    phone: '(555) 234-5678',
    date_of_birth: '1990-07-22',
    notes: 'Sensitive skin - use gentle products',
    created_at: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    name: 'Lisa Chen',
    email: 'lisa.chen@email.com',
    phone: '(555) 345-6789',
    date_of_birth: '1988-11-08',
    notes: 'Regular Botox client',
    created_at: '2024-03-05T09:15:00Z',
  },
  {
    id: '4',
    name: 'Amanda Williams',
    email: 'amanda.w@email.com',
    phone: '(555) 456-7890',
    date_of_birth: '1992-05-30',
    notes: 'New client - referred by Lisa Chen',
    created_at: '2024-06-10T11:45:00Z',
  },
  {
    id: '5',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '(555) 567-8901',
    date_of_birth: '1987-09-14',
    notes: '',
    created_at: '2024-04-18T16:20:00Z',
  },
];

export function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
          <p className="text-muted-foreground">{mockClients.length} total clients</p>
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
            {filteredClients.length === 0 ? (
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
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold">
                          {getInitials(client.name)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {client.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.phone}
                            </span>
                          )}
                        </div>
                        {client.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {client.notes}
                          </p>
                        )}
                      </div>

                      {/* Member Since */}
                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-muted-foreground">Member since</p>
                        <p className="text-sm text-foreground">
                          {new Date(client.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
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
