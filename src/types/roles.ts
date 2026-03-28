// Role-based types for MedSpa Operating System

export type AppRole = 'owner' | 'employee' | 'client';
export type EmployeeType = 'front_desk' | 'provider';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  employee_type: EmployeeType | null;
  staff_id: string | null;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermissions {
  canViewAnalytics: boolean;
  canViewFinance: boolean;
  canManageStaff: boolean;
  canManageServices: boolean;
  canManageInventory: boolean;
  canViewAllClients: boolean;
  canProcessPayroll: boolean;
  canEditSettings: boolean;
  canViewOwnReports: boolean;
  canClockInOut: boolean;
  canAccessPOS: boolean;
  canManageAppointments: boolean;
  canViewOwnData: boolean;
  canViewChartNotes: boolean;
  canCreateChartNotes: boolean;
  canViewHealthHistory: boolean;
  canIssueRefunds: boolean;
  canApplyDiscounts: boolean;
  maxDiscountPercent: number;
  canExportClientData: boolean;
  canMessageClients: boolean;
  canViewAuditLog: boolean;
  hasCustomPermissions: boolean;
}

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  owner: {
    canViewAnalytics: true,
    canViewFinance: true,
    canManageStaff: true,
    canManageServices: true,
    canManageInventory: true,
    canViewAllClients: true,
    canProcessPayroll: true,
    canEditSettings: true,
    canViewOwnReports: true,
    canClockInOut: true,
    canAccessPOS: true,
    canManageAppointments: true,
    canViewOwnData: true,
    canViewChartNotes: true,
    canCreateChartNotes: true,
    canViewHealthHistory: true,
    canIssueRefunds: true,
    canApplyDiscounts: true,
    maxDiscountPercent: 100,
    canExportClientData: true,
    canMessageClients: true,
    canViewAuditLog: true,
    hasCustomPermissions: false,
  },
  employee: {
    canViewAnalytics: false,
    canViewFinance: false,
    canManageStaff: false,
    canManageServices: false,
    canManageInventory: false,
    canViewAllClients: true,
    canProcessPayroll: false,
    canEditSettings: false,
    canViewOwnReports: true,
    canClockInOut: true,
    canAccessPOS: true,
    canManageAppointments: true,
    canViewOwnData: true,
    canViewChartNotes: false,
    canCreateChartNotes: false,
    canViewHealthHistory: false,
    canIssueRefunds: false,
    canApplyDiscounts: true,
    maxDiscountPercent: 10,
    canExportClientData: false,
    canMessageClients: false,
    canViewAuditLog: false,
    hasCustomPermissions: false,
  },
  client: {
    canViewAnalytics: false,
    canViewFinance: false,
    canManageStaff: false,
    canManageServices: false,
    canManageInventory: false,
    canViewAllClients: false,
    canProcessPayroll: false,
    canEditSettings: false,
    canViewOwnReports: false,
    canClockInOut: false,
    canAccessPOS: false,
    canManageAppointments: false,
    canViewOwnData: true,
    canViewChartNotes: false,
    canCreateChartNotes: false,
    canViewHealthHistory: false,
    canIssueRefunds: false,
    canApplyDiscounts: false,
    maxDiscountPercent: 0,
    canExportClientData: false,
    canMessageClients: false,
    canViewAuditLog: false,
    hasCustomPermissions: false,
  },
};

// Employee type specific permissions
export const EMPLOYEE_TYPE_PERMISSIONS: Record<EmployeeType, Partial<RolePermissions>> = {
  front_desk: {
    canViewAllClients: true,
    canManageAppointments: true,
    canAccessPOS: true,
    canViewChartNotes: false,
    canCreateChartNotes: false,
    canViewHealthHistory: false,
    canMessageClients: true,
    canApplyDiscounts: true,
    maxDiscountPercent: 10,
  },
  provider: {
    canViewAllClients: true,
    canManageAppointments: true,
    canAccessPOS: true,
    canViewChartNotes: true,
    canCreateChartNotes: true,
    canViewHealthHistory: true,
    canMessageClients: true,
    canApplyDiscounts: true,
    maxDiscountPercent: 20,
  },
};
