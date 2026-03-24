import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Target,
  BarChart3,
  FileText,
  Sparkles
} from 'lucide-react';
import { SalesOverview } from '@/components/analytics/SalesOverview';
import { MachineROITracker } from '@/components/analytics/MachineROITracker';
import { StaffPerformanceReport } from '@/components/analytics/StaffPerformanceReport';
import { ProductPackageAnalytics } from '@/components/analytics/ProductPackageAnalytics';
import { ExpertInsights } from '@/components/analytics/ExpertInsights';
import { DateRangeFilter, DateRange } from '@/components/analytics/DateRangeFilter';
import { PDFExportButton } from '@/components/analytics/PDFExportButton';
import { UpsellPerformanceReport } from '@/components/analytics/UpsellPerformanceReport';

export default function ManagerAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'machines';
  
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'this_month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['machines', 'staff', 'products', 'insights', 'upsell'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Manager Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive business intelligence dashboard
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <PDFExportButton dateRange={dateRange} />
        </div>
      </div>

      {/* Sales Overview */}
      <SalesOverview dateRange={dateRange} />

      {/* Tabbed Analytics Sections */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="machines" className="data-[state=active]:bg-background">
            <BarChart3 className="w-4 h-4 mr-2" />
            Machine ROI
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-background">
            <DollarSign className="w-4 h-4 mr-2" />
            Staff Performance
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-background">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Products & Packages
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-background">
            <Target className="w-4 h-4 mr-2" />
            Expert Insights
          </TabsTrigger>
          <TabsTrigger value="upsell" className="data-[state=active]:bg-background">
            <Sparkles className="w-4 h-4 mr-2" />
            Upsell Performance
          </TabsTrigger>
            Expert Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="machines" className="space-y-6">
          <MachineROITracker dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <StaffPerformanceReport dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <ProductPackageAnalytics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <ExpertInsights dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="upsell" className="space-y-6">
          <UpsellPerformanceReport dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
