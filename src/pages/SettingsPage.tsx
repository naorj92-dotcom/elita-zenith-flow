import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings, CreditCard, Shield, Building, Clock, Bell, Paintbrush } from 'lucide-react';
import { BrandingSettings } from '@/components/settings/BrandingSettings';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your MedSpa operating system
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Policies
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Basic information about your MedSpa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" defaultValue="Elite MedSpa" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" defaultValue="Elevate Your Beauty" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue="(310) 555-0123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue="info@elitemedspa.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" defaultValue="123 Luxury Lane, Suite 100, Beverly Hills, CA 90210" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue="www.elitemedspa.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleReview">Google Review URL</Label>
                  <Input id="googleReview" defaultValue="https://g.page/r/elite-medspa/review" />
                </div>
              </div>
              <Button onClick={() => toast.success('Business information saved')}>
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Set your operating hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{day}</span>
                    <div className="flex items-center gap-2">
                      <Input className="w-24" defaultValue={day === 'Sunday' ? 'Closed' : '9:00 AM'} />
                      <span>-</span>
                      <Input className="w-24" defaultValue={day === 'Sunday' ? '' : '7:00 PM'} />
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => toast.success('Business hours saved')}>
                Save Hours
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Appointment Reminders</p>
                  <p className="text-sm text-muted-foreground">Send reminders 24 hours before appointments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Follow-up Messages</p>
                  <p className="text-sm text-muted-foreground">Send aftercare instructions post-appointment</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">Send promotional content to clients</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <BrandingSettings />
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Settings</CardTitle>
              <CardDescription>
                Configure sales tax and fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Sales Tax Rate (%)</Label>
                  <Input id="taxRate" type="number" step="0.01" defaultValue="8.25" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input id="taxId" placeholder="XX-XXXXXXX" />
                </div>
              </div>
              <Button onClick={() => toast.success('Tax settings saved')}>
                Save Tax Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Accepted payment types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Credit/Debit Cards</p>
                  <p className="text-sm text-muted-foreground">Accept Visa, Mastercard, Amex</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cash</p>
                  <p className="text-sm text-muted-foreground">Accept cash payments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Gift Cards</p>
                  <p className="text-sm text-muted-foreground">Accept in-house gift cards</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Split Payments</p>
                  <p className="text-sm text-muted-foreground">Allow multiple payment methods per transaction</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commission Tiers</CardTitle>
              <CardDescription>
                Service commission thresholds for providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="font-medium text-lg">Tier 1</p>
                  <p className="text-2xl font-bold text-primary">40%</p>
                  <p className="text-sm text-muted-foreground">$0 - $5,000/month</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="font-medium text-lg">Tier 2</p>
                  <p className="text-2xl font-bold text-primary">45%</p>
                  <p className="text-sm text-muted-foreground">$5,001 - $10,000/month</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="font-medium text-lg">Tier 3</p>
                  <p className="text-2xl font-bold text-primary">50%</p>
                  <p className="text-sm text-muted-foreground">$10,001+/month</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retailCommission">Retail Commission Rate (%)</Label>
                <Input id="retailCommission" type="number" step="0.1" defaultValue="10" className="max-w-xs" />
              </div>
              <Button onClick={() => toast.success('Commission settings saved')}>
                Save Commission Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Settings */}
        <TabsContent value="policies" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cancellation Policy</CardTitle>
              <CardDescription>
                Define your cancellation and no-show policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cancelWindow">Cancellation Window (hours)</Label>
                  <Input id="cancelWindow" type="number" defaultValue="24" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancelFee">Late Cancellation Fee ($)</Label>
                  <Input id="cancelFee" type="number" defaultValue="50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="noShowFee">No-Show Fee ($)</Label>
                  <Input id="noShowFee" type="number" defaultValue="100" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancelPolicy">Policy Text</Label>
                <Textarea 
                  id="cancelPolicy"
                  rows={4}
                  defaultValue="Appointments must be cancelled at least 24 hours in advance. Late cancellations will be charged a $50 fee. No-shows will be charged the full service amount."
                />
              </div>
              <Button onClick={() => toast.success('Cancellation policy saved')}>
                Save Policy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Rules</CardTitle>
              <CardDescription>
                Configure booking restrictions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minBooking">Minimum Booking Lead Time (hours)</Label>
                  <Input id="minBooking" type="number" defaultValue="2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxBooking">Maximum Advance Booking (days)</Label>
                  <Input id="maxBooking" type="number" defaultValue="90" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Online Booking</p>
                  <p className="text-sm text-muted-foreground">Clients can book appointments from the portal</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Deposit</p>
                  <p className="text-sm text-muted-foreground">Collect deposit for certain services</p>
                </div>
                <Switch />
              </div>
              <Button onClick={() => toast.success('Booking rules saved')}>
                Save Rules
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consent & Waivers</CardTitle>
              <CardDescription>
                Required forms and agreements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Intake Form</p>
                  <p className="text-sm text-muted-foreground">New clients must complete intake form</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Service-Specific Consent</p>
                  <p className="text-sm text-muted-foreground">Require consent for flagged services</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Photo Consent</p>
                  <p className="text-sm text-muted-foreground">Require consent before taking photos</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SettingsPage;
