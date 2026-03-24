import React, { useState, useEffect } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Mail, Lock, Loader2, Save } from 'lucide-react';

export function ClientProfilePage() {
  const { client, user } = useClientAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setFirstName(client.first_name || '');
      setLastName(client.last_name || '');
      setPhone(client.phone || '');
      setDob(client.date_of_birth || '');
      setSmsEnabled(!client.sms_opt_out);
      setEmailEnabled(!client.email_opt_out);
      setAvatarUrl(client.avatar_url || null);
    }
  }, [client]);

  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
        date_of_birth: dob || null,
        sms_opt_out: !smsEnabled,
        email_opt_out: !emailEnabled,
      })
      .eq('id', client.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client?.id) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `avatars/${client.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('client-photos')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload photo');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('client-photos')
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    await supabase
      .from('clients')
      .update({ avatar_url: publicUrl })
      .eq('id', client.id);

    setAvatarUrl(publicUrl);
    setUploading(false);
    toast.success('Photo updated');
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error('Failed to send reset email');
    } else {
      toast.success('Password reset email sent — check your inbox');
    }
  };

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-heading font-semibold">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details</p>
      </div>

      {/* Avatar */}
      <Card className="card-luxury">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </div>
          <div>
            <p className="font-semibold text-lg">{firstName} {lastName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Input value={user?.email || ''} disabled className="opacity-70" />
              <Button variant="link" size="sm" className="shrink-0 text-xs gap-1" onClick={handleChangePassword}>
                <Mail className="h-3.5 w-3.5" /> Change email
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="card-luxury">
        <CardHeader>
          <CardTitle className="text-lg">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">SMS Notifications</p>
              <p className="text-xs text-muted-foreground">Appointment reminders & updates via text</p>
            </div>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Confirmations, aftercare tips & promotions</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
        <Button variant="outline" onClick={handleChangePassword} className="gap-2">
          <Lock className="h-4 w-4" />
          Change Password
        </Button>
      </div>
    </div>
  );
}
