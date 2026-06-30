export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
  },
  dashboard: '/dashboard',
  notifications: '/notifications',
  orders: {
    list: '/orders',
    create: '/orders',
    details: (id: string) => `/orders/${id}`,
    update: (id: string) => `/orders/${id}`,
    delete: (id: string) => `/orders/${id}`,
  },
  customers: {
    list: '/customers',
    create: '/customers',
    details: (id: string) => `/customers/${id}`,
    update: (id: string) => `/customers/${id}`,
    delete: (id: string) => `/customers/${id}`,
    prescriptions: (id: string) => `/customers/${id}/prescriptions`,
    orders: (id: string) => `/customers/${id}/orders`,
  },
  prescriptions: {
    create: (customerId: string) => `/customers/${customerId}/prescriptions`,
    details: (id: string) => `/prescriptions/${id}`,
    update: (id: string) => `/prescriptions/${id}`,
    delete: (id: string) => `/prescriptions/${id}`,
  },
} as const;
