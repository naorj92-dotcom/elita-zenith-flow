import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Crown, Heart, FileWarning, Info, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { DEMO_CLIENT_NOTES, DEMO_CLIENT_FLAGS } from '@/hooks/useDemoData';

export function ClientNotesFlags() {
  const { client, isDemo } = useClientAuth();

  // In demo mode, use demo data
  const notes = isDemo ? DEMO_CLIENT_NOTES : [];
  const flags = isDemo ? DEMO_CLIENT_FLAGS : [];

  // Build flags from client data
  const clientFlags = [...flags];
  if (client?.is_vip && !clientFlags.find(f => f.type === 'vip')) {
    clientFlags.unshift({ type: 'vip', label: 'VIP Member', color: 'gold' });
  }

  const getFlagIcon = (type: string) => {
    switch (type) {
      case 'vip':
        return <Crown className="h-3 w-3" />;
      case 'allergy':
      case 'medical':
        return <AlertTriangle className="h-3 w-3" />;
      case 'preference':
        return <Heart className="h-3 w-3" />;
      case 'warning':
        return <FileWarning className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const getFlagColor = (color: string) => {
    switch (color) {
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getNoteTypeStyle = (type: string) => {
    switch (type) {
      case 'medical':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          bg: 'bg-orange-50 border-orange-200',
        };
      case 'preference':
        return {
          icon: <Heart className="h-4 w-4 text-pink-500" />,
          bg: 'bg-pink-50 border-pink-200',
        };
      default:
        return {
          icon: <StickyNote className="h-4 w-4 text-muted-foreground" />,
          bg: 'bg-muted/50',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Flags */}
      {clientFlags.length > 0 && (
        <Card className="card-luxury">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Important Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {clientFlags.map((flag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`gap-1.5 ${getFlagColor(flag.color)}`}
                >
                  {getFlagIcon(flag.type)}
                  {flag.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <Card className="card-luxury">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Care Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.map((note: any) => {
              const style = getNoteTypeStyle(note.type);
              return (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border ${style.bg} flex gap-3`}
                >
                  <div className="shrink-0 mt-0.5">{style.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added by {note.staff_name} • {format(new Date(note.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {clientFlags.length === 0 && notes.length === 0 && (
        <Card className="card-luxury">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No special notes or flags</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}