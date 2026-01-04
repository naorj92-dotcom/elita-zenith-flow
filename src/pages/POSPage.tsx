import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, ShoppingCart, Receipt, CreditCard, DollarSign, Gift, Percent, Star, Search, Check, Mail, MailCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ReceiptPreview } from '@/components/pos/ReceiptPreview';
import { LiveReceiptPreview } from '@/components/pos/LiveReceiptPreview';
import { 
  ReceiptData, 
  RetailItem, 
  TreatmentSummary, 
  PackageStatus,
  MembershipStatus,
  generateReceiptNumber, 
  ELITA_MEDSPA_INFO 
} from '@/components/pos/ReceiptData';
import { addDays, format } from 'date-fns';

interface CartItem {
  type: 'service' | 'product';
  id: string;
  name: string;
  price: number;
  quantity: number;
  machineUsed?: string;
}

export function POSPage() {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(8.25);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'gift_card' | 'split'>('card');
  const [treatmentSummary, setTreatmentSummary] = useState<TreatmentSummary>({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<ReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Loyalty & Gift Card state
  const [loyaltyPointsBalance, setLoyaltyPointsBalance] = useState<number>(0);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState<number>(0);
  const [giftCardCode, setGiftCardCode] = useState<string>('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardLookupLoading, setGiftCardLookupLoading] = useState(false);
  const [giftCardApplied, setGiftCardApplied] = useState<{ code: string; amount: number } | null>(null);
  
  // Email receipt state
  const [sendEmailReceipt, setSendEmailReceipt] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch staff
  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch services with machines
  const { data: services = [] } = useQuery({
    queryKey: ['services-pos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, machine_type_id, machines(name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products-pos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, quantity_in_stock')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch client loyalty points when client changes
  useEffect(() => {
    const fetchLoyaltyBalance = async () => {
      if (!selectedClient) {
        setLoyaltyPointsBalance(0);
        setLoyaltyPointsToRedeem(0);
        return;
      }
      
      const { data, error } = await supabase.rpc('get_client_loyalty_balance', {
        p_client_id: selectedClient,
      });
      
      if (!error && data !== null) {
        setLoyaltyPointsBalance(data);
      } else {
        setLoyaltyPointsBalance(0);
      }
    };
    
    fetchLoyaltyBalance();
  }, [selectedClient]);

  // Gift card lookup function
  const lookupGiftCard = async () => {
    if (!giftCardCode.trim()) {
      toast.error('Please enter a gift card code');
      return;
    }
    
    setGiftCardLookupLoading(true);
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('code, remaining_amount, is_active, expires_at')
        .eq('code', giftCardCode.trim().toUpperCase())
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        toast.error('Gift card not found');
        setGiftCardBalance(null);
      } else if (!data.is_active) {
        toast.error('This gift card is inactive');
        setGiftCardBalance(null);
      } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('This gift card has expired');
        setGiftCardBalance(null);
      } else {
        setGiftCardBalance(Number(data.remaining_amount));
        toast.success(`Gift card balance: $${Number(data.remaining_amount).toFixed(2)}`);
      }
    } catch (error) {
      console.error('Gift card lookup error:', error);
      toast.error('Failed to lookup gift card');
    } finally {
      setGiftCardLookupLoading(false);
    }
  };

  const applyGiftCard = () => {
    if (giftCardBalance === null || giftCardBalance <= 0) {
      toast.error('No gift card balance to apply');
      return;
    }
    
    const amountToApply = Math.min(giftCardBalance, totalAmount);
    setGiftCardApplied({ code: giftCardCode.trim().toUpperCase(), amount: amountToApply });
    toast.success(`Applied $${amountToApply.toFixed(2)} from gift card`);
  };

  const applyLoyaltyPoints = () => {
    if (loyaltyPointsToRedeem <= 0) {
      toast.error('Please enter points to redeem');
      return;
    }
    if (loyaltyPointsToRedeem > loyaltyPointsBalance) {
      toast.error('Insufficient loyalty points');
      return;
    }
    // Convert points to dollars (100 points = $1)
    const pointsDiscount = loyaltyPointsToRedeem / 100;
    setDiscountAmount((prev) => prev + pointsDiscount);
    toast.success(`Applied ${loyaltyPointsToRedeem} points ($${pointsDiscount.toFixed(2)} discount)`);
    setLoyaltyPointsToRedeem(0);
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.type === item.type);
      if (existing && item.type === 'product') {
        return prev.map((i) =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (id: string, type: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id && item.type === type
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string, type: string) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.type === type)));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const giftCardDiscount = giftCardApplied?.amount || 0;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount - giftCardDiscount);
  const taxAmount = (taxableSubtotal * taxRate) / 100;
  const totalAmount = Math.max(0, taxableSubtotal + taxAmount + tipAmount);

  // Build live preview data
  const livePreviewData = useMemo(() => {
    const client = clients.find((c) => c.id === selectedClient);
    const provider = staff.find((s) => s.id === selectedStaff);
    const serviceItem = cart.find((item) => item.type === 'service');
    const retailItems: RetailItem[] = cart
      .filter((item) => item.type === 'product')
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      }));

    return {
      clientName: client ? `${client.first_name} ${client.last_name}` : undefined,
      providerName: provider ? `${provider.first_name} ${provider.last_name}` : undefined,
      serviceName: serviceItem?.name,
      servicePrice: serviceItem ? serviceItem.price * serviceItem.quantity : 0,
      machineUsed: serviceItem?.machineUsed,
      treatmentSummary,
      retailItems,
      retailTotal: retailItems.reduce((sum, item) => sum + item.total, 0),
      subtotal,
      taxAmount,
      tipAmount,
      discountAmount,
      totalAmount,
    };
  }, [cart, clients, staff, selectedClient, selectedStaff, treatmentSummary, subtotal, taxAmount, tipAmount, discountAmount, totalAmount]);

  const handleCheckout = async () => {
    if (!selectedClient || !selectedStaff) {
      toast.error('Please select a client and provider');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);

    try {
      const client = clients.find((c) => c.id === selectedClient);
      const provider = staff.find((s) => s.id === selectedStaff);
      const serviceItem = cart.find((item) => item.type === 'service');
      const retailItems: RetailItem[] = cart
        .filter((item) => item.type === 'product')
        .map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        }));

      const receiptNumber = generateReceiptNumber();

      // Fetch client package status
      let packageStatus: PackageStatus | undefined;
      const { data: clientPackages } = await supabase
        .from('client_packages')
        .select('*, packages(name)')
        .eq('client_id', selectedClient)
        .eq('status', 'active')
        .limit(1);
      
      if (clientPackages && clientPackages.length > 0) {
        const pkg = clientPackages[0];
        packageStatus = {
          packageName: (pkg.packages as { name: string } | null)?.name || 'Package',
          sessionsRemaining: pkg.sessions_total - pkg.sessions_used,
          sessionsTotal: pkg.sessions_total,
        };
      }

      // Fetch client membership status
      let membershipStatus: MembershipStatus | undefined;
      const { data: clientMemberships } = await supabase
        .from('client_memberships')
        .select('*, memberships(name)')
        .eq('client_id', selectedClient)
        .eq('status', 'active')
        .limit(1);
      
      if (clientMemberships && clientMemberships.length > 0) {
        const membership = clientMemberships[0];
        membershipStatus = {
          tierName: (membership.memberships as { name: string } | null)?.name || 'Member',
          nextBillingDate: membership.next_billing_date 
            ? format(new Date(membership.next_billing_date), 'MMM d, yyyy')
            : 'N/A',
        };
      }

      // Calculate next recommended booking based on machine/service type
      let nextRecommendedBooking: string | undefined;
      if (serviceItem?.machineUsed) {
        const machineName = serviceItem.machineUsed.toLowerCase();
        let daysUntilNext = 7; // Default 7 days
        
        // Adjust recommendation based on treatment type
        if (machineName.includes('contour') || machineName.includes('rf') || machineName.includes('body')) {
          daysUntilNext = 7; // Body treatments: weekly
        } else if (machineName.includes('laser') || machineName.includes('ipl')) {
          daysUntilNext = 28; // Laser: monthly
        } else if (machineName.includes('hydra') || machineName.includes('facial')) {
          daysUntilNext = 14; // Facials: bi-weekly
        } else if (machineName.includes('cool') || machineName.includes('cryo')) {
          daysUntilNext = 30; // Coolsculpting: monthly
        }
        
        nextRecommendedBooking = format(addDays(new Date(), daysUntilNext), 'EEEE, MMMM d, yyyy');
      }

      // Create receipt in database
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert([{
          receipt_number: receiptNumber,
          client_id: selectedClient,
          staff_id: selectedStaff,
          service_name: serviceItem?.name || null,
          service_price: serviceItem ? serviceItem.price * serviceItem.quantity : 0,
          machine_used: serviceItem?.machineUsed || null,
          treatment_summary: JSON.parse(JSON.stringify(treatmentSummary)),
          retail_items: JSON.parse(JSON.stringify(retailItems)),
          retail_total: retailItems.reduce((sum, item) => sum + item.total, 0),
          subtotal: subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          tip_amount: tipAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          google_review_url: ELITA_MEDSPA_INFO.googleReviewUrl,
        }])
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create transaction for service
      if (serviceItem) {
        await supabase.from('transactions').insert({
          client_id: selectedClient,
          staff_id: selectedStaff,
          transaction_type: 'service',
          amount: serviceItem.price * serviceItem.quantity,
          description: serviceItem.name,
        });
      }

      // Create transactions for retail items
      for (const item of retailItems) {
        await supabase.from('transactions').insert({
          client_id: selectedClient,
          staff_id: selectedStaff,
          transaction_type: 'retail',
          amount: item.total,
          description: item.name,
        });
      }

      // Update client last visit
      await supabase
        .from('clients')
        .update({
          last_visit_date: new Date().toISOString(),
        })
        .eq('id', selectedClient);

      // Generate receipt data for preview
      const receipt: ReceiptData = {
        id: receiptData.id,
        receiptNumber: receiptNumber,
        clientId: selectedClient,
        clientName: client ? `${client.first_name} ${client.last_name}` : 'Guest',
        clientEmail: client?.email || undefined,
        clientPhone: client?.phone || undefined,
        staffId: selectedStaff,
        providerName: provider ? `${provider.first_name} ${provider.last_name}` : 'Staff',
        serviceName: serviceItem?.name,
        servicePrice: serviceItem ? serviceItem.price * serviceItem.quantity : 0,
        machineUsed: serviceItem?.machineUsed,
        treatmentSummary: treatmentSummary,
        retailItems: retailItems,
        retailTotal: retailItems.reduce((sum, item) => sum + item.total, 0),
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        tipAmount: tipAmount,
        discountAmount: discountAmount,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        receiptFormat: 'standard',
        googleReviewUrl: ELITA_MEDSPA_INFO.googleReviewUrl,
        createdAt: new Date(),
        packageStatus,
        membershipStatus,
        nextRecommendedBooking,
      };

      setGeneratedReceipt(receipt);
      setShowReceipt(true);
      toast.success('Sale completed successfully!');

      // Send email receipt if enabled and client has email
      if (sendEmailReceipt && client?.email) {
        setSendingEmail(true);
        try {
          const { error: emailError } = await supabase.functions.invoke('send-receipt-email', {
            body: {
              receipt_id: receiptData.id,
              client_email: client.email,
              client_name: `${client.first_name} ${client.last_name}`,
              receipt_number: receiptNumber,
              provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Staff',
              service_name: serviceItem?.name,
              service_price: serviceItem ? serviceItem.price * serviceItem.quantity : 0,
              retail_items: retailItems,
              retail_total: retailItems.reduce((sum, item) => sum + item.total, 0),
              subtotal,
              tax_rate: taxRate,
              tax_amount: taxAmount,
              tip_amount: tipAmount,
              discount_amount: discountAmount,
              total_amount: totalAmount,
              payment_method: paymentMethod,
              machine_used: serviceItem?.machineUsed,
              treatment_summary: treatmentSummary,
              package_status: packageStatus,
              membership_status: membershipStatus,
              next_recommended_booking: nextRecommendedBooking,
              created_at: new Date().toISOString(),
            },
          });
          
          if (emailError) {
            console.error('Email send error:', emailError);
            toast.error('Sale complete but failed to send email receipt');
          } else {
            toast.success('Email receipt sent to ' + client.email);
          }
        } catch (emailErr) {
          console.error('Email send error:', emailErr);
        } finally {
          setSendingEmail(false);
        }
      }

      // Clear cart
      setCart([]);
      setTipAmount(0);
      setDiscountAmount(0);
      setTreatmentSummary({});
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process sale');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Point of Sale</h1>
        <p className="text-muted-foreground">Process sales and generate receipts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Services & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Provider Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Provider</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {services.map((service) => (
                  <Button
                    key={service.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-1"
                    onClick={() =>
                      addToCart({
                        type: 'service',
                        id: service.id,
                        name: service.name,
                        price: Number(service.price),
                        quantity: 1,
                        machineUsed: (service.machines as { name: string } | null)?.name,
                      })
                    }
                  >
                    <span className="font-medium text-sm">{service.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ${Number(service.price).toFixed(2)}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {products.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="h-auto p-3 flex flex-col items-start gap-1"
                    onClick={() =>
                      addToCart({
                        type: 'product',
                        id: product.id,
                        name: product.name,
                        price: Number(product.price),
                        quantity: 1,
                      })
                    }
                    disabled={product.quantity_in_stock < 1}
                  >
                    <span className="font-medium text-xs">{product.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ${Number(product.price).toFixed(2)}
                    </span>
                    {product.quantity_in_stock < 5 && (
                      <Badge variant="secondary" className="text-[10px]">
                        Low stock
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Treatment Summary */}
          {cart.some((item) => item.type === 'service') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Treatment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Area Treated</Label>
                    <Input
                      placeholder="e.g., Abdomen, Thighs"
                      value={treatmentSummary.areaTreated || ''}
                      onChange={(e) =>
                        setTreatmentSummary((prev) => ({ ...prev, areaTreated: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Intensity</Label>
                    <Input
                      placeholder="e.g., Level 5"
                      value={treatmentSummary.intensity || ''}
                      onChange={(e) =>
                        setTreatmentSummary((prev) => ({ ...prev, intensity: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input
                      placeholder="e.g., 45 minutes"
                      value={treatmentSummary.duration || ''}
                      onChange={(e) =>
                        setTreatmentSummary((prev) => ({ ...prev, duration: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Machine Settings</Label>
                    <Input
                      placeholder="e.g., RF 2.5 MHz"
                      value={treatmentSummary.machineSettings || ''}
                      onChange={(e) =>
                        setTreatmentSummary((prev) => ({ ...prev, machineSettings: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Session Notes</Label>
                    <Textarea
                      placeholder="Additional notes about the treatment..."
                      value={treatmentSummary.notes || ''}
                      onChange={(e) =>
                        setTreatmentSummary((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Cart & Live Preview */}
        <div className="space-y-4">
          {/* Live Receipt Preview - Always Visible */}
          <LiveReceiptPreview 
            receipt={livePreviewData}
            taxRate={taxRate}
          />
          
          {/* Cart & Checkout Controls */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">Cart is empty</p>
              ) : (
                <div className="space-y-2 max-h-[150px] overflow-auto">
                  {cart.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.type === 'product' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.id, item.type, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center text-xs">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.id, item.type, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeFromCart(item.id, item.type)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Tax, Tip & Discount */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Tax %
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="25"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tip</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tipAmount || ''}
                    onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Discount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-sm h-8"
                  />
                </div>
              </div>

              {/* Loyalty Points Redemption */}
              {selectedClient && loyaltyPointsBalance > 0 && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs flex items-center gap-1 text-primary">
                      <Star className="h-3 w-3" />
                      Loyalty Points
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      {loyaltyPointsBalance} pts available
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={loyaltyPointsBalance}
                      step="1"
                      value={loyaltyPointsToRedeem || ''}
                      onChange={(e) => setLoyaltyPointsToRedeem(Math.min(Number(e.target.value) || 0, loyaltyPointsBalance))}
                      placeholder="Points to redeem"
                      className="text-sm h-8 flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={applyLoyaltyPoints}
                      disabled={loyaltyPointsToRedeem <= 0}
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    100 points = $1.00 discount
                  </p>
                </div>
              )}

              {/* Gift Card Lookup */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs flex items-center gap-1 mb-2">
                  <Gift className="h-3 w-3" />
                  Gift Card
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                    placeholder="Enter gift card code"
                    className="text-sm h-8 flex-1 uppercase"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={lookupGiftCard}
                    disabled={giftCardLookupLoading || !giftCardCode.trim()}
                  >
                    {giftCardLookupLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <Search className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                {giftCardBalance !== null && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-background rounded border">
                    <span className="text-xs">
                      Balance: <span className="font-medium text-green-600">${giftCardBalance.toFixed(2)}</span>
                    </span>
                    {!giftCardApplied && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-6 text-xs"
                        onClick={applyGiftCard}
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                )}
                {giftCardApplied && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-900">
                    <span className="text-xs flex items-center gap-1 text-green-700 dark:text-green-400">
                      <Check className="h-3 w-3" />
                      Applied: ${giftCardApplied.amount.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-destructive"
                      onClick={() => setGiftCardApplied(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-xs">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { value: 'card', icon: CreditCard, label: 'Card' },
                    { value: 'cash', icon: DollarSign, label: 'Cash' },
                    { value: 'gift_card', icon: Gift, label: 'Gift Card' },
                    { value: 'split', icon: Receipt, label: 'Split' },
                  ].map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      variant={paymentMethod === value ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1"
                      onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {giftCardApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Gift Card</span>
                    <span>-${giftCardApplied.amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tip</span>
                    <span>${tipAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-heading font-semibold">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Email Receipt Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm">Email Receipt</Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedClient && clients.find(c => c.id === selectedClient)?.email 
                        ? 'Send to client email'
                        : 'No email on file'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sendEmailReceipt}
                  onCheckedChange={setSendEmailReceipt}
                  disabled={!selectedClient || !clients.find(c => c.id === selectedClient)?.email}
                />
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
              >
                {sendingEmail ? (
                  <>
                    <MailCheck className="h-4 w-4 animate-pulse" />
                    Sending Receipt...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    {isProcessing ? 'Processing...' : 'Complete Sale'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {generatedReceipt && (
        <ReceiptPreview
          receipt={generatedReceipt}
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
