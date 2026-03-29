export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  avatar?: string;
  role: "admin" | "viewer";
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: "7d" | "14d" | "30d" | "90d" | "custom";
  label: string;
}

export interface Integration {
  connected: boolean;
  account?: string;
  accountId?: string;
}

export interface UserIntegrations {
  meta: Integration;
  google: Integration;
  ga4: Integration;
}

// KPI types
export interface KPIData {
  value: number;
  previousValue: number;
  format: "currency" | "percent" | "number" | "multiplier";
}

// Overview types
export interface OverviewKPIs {
  totalSpend: KPIData;
  totalLeads: KPIData;
  cpl: KPIData;
  totalClicks: KPIData;
  totalImpressions: KPIData;
  ctr: KPIData;
  totalPageViews: KPIData;
  cpm: KPIData;
}

export interface TimeSeriesPoint {
  date: string;
  investment: number;
  revenue: number;
}

export interface SpendShare {
  platform: string;
  value: number;
  color: string;
}

// Meta Ads types
export interface MetaKPIs {
  spend: KPIData;
  impressions: KPIData;
  cpm: KPIData;
  ctr: KPIData;
  cpc: KPIData;
  purchases: KPIData;
  cpa: KPIData;
  roas: KPIData;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: "active" | "paused";
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cpa: number;
  roas: number;
}

// Google Ads types
export interface GoogleKPIs {
  cost: KPIData;
  clicks: KPIData;
  conversions: KPIData;
  costPerConversion: KPIData;
  ctr: KPIData;
  avgCpc: KPIData;
  roas: KPIData;
  impressionShare: KPIData;
}

export interface GoogleClicksConversionsPoint {
  date: string;
  clicks: number;
  conversions: number;
}

export interface GoogleCampaignType {
  type: string;
  cost: number;
  clicks: number;
  conversions: number;
  roas: number;
}

// GA4 types
export interface GA4KPIs {
  users: KPIData;
  sessions: KPIData;
  engagementRate: KPIData;
  conversionEvents: KPIData;
  revenue: KPIData;
}

export interface SessionsBySource {
  source: string;
  sessions: number;
  color: string;
}

// Overview daily series
export interface OverviewDailyPoint {
  date: string;
  impressions: number;
  clicks: number;
  sessions: number;
  investment: number;
  ctr: number;
  leads: number;
  cpm: number;
}

export interface KeywordStat {
  keyword: string;
  matchType: "Exata" | "Frase" | "Ampla";
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number;
  conversions: number;
  cpa: number;
}

// Google Ads active campaigns
export interface GoogleCampaign {
  id: string;
  name: string;
  type: "Search" | "Performance Max" | "Demand Gen" | "Display" | "YouTube";
  status: "active" | "paused";
  spend: number;
  clicks: number;
  conversions: number;
  roas: number;
  keywords?: string[];
  keywordStats?: KeywordStat[];
  assets?: string[];
  videos?: string[];
}

// GA4 breakdowns
export interface GA4DeviceBreakdown {
  device: string;
  sessions: number;
  color: string;
}

export interface GA4RegionBreakdown {
  region: string;
  sessions: number;
  percent: number;
}

export interface GA4SessionDuration {
  bucket: string;
  users: number;
}
