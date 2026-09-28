import { authGuard, guestGuard } from 'auth';
import { Routes } from '@angular/router';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { MemberLayout } from './layout/member-layout/member-layout';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/pages/login/login').then((m) => m.Login),
  },

  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/pages/register/register').then((m) => m.Register),
  },

  {
    path: 'reset-password',
    loadComponent: () => import('./auth/pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'reset-password/:payload',
    loadComponent: () => import('./auth/pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },

  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'members',
        loadComponent: () => import('./admin/features/members/members').then((m) => m.Members),
      },
      {
        path: 'plans',
        loadComponent: () => import('./admin/features/plans/plans').then((m) => m.Plans),
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./admin/features/subscriptions/subscriptions').then((m) => m.Subscriptions),
      },
      {
        path: 'payments',
        loadComponent: () => import('./admin/features/payments/payments').then((m) => m.Payments),
      },
      {
        path: 'offers',
        loadComponent: () => import('./admin/features/offers/offers').then((m) => m.Offers),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./admin/features/attendance/attendance').then((m) => m.AttendancePage),
      },
    ],
  },

  {
    path: 'member',
    component: MemberLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },

      {
        path: 'dashboard',
        loadComponent: () => import('./member/features/home/home').then((m) => m.Home),
      },
      {
        path: 'home',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'plans',
        loadComponent: () => import('./member/features/plans/plans').then((m) => m.MemberPlans),
      },
      {
        path: 'membership',
        loadComponent: () => import('./member/features/membership/membership').then((m) => m.Membership),
      },
      {
        path: 'membership/history',
        loadComponent: () => import('./member/features/membership-history/membership-history').then((m) => m.MembershipHistory),
      },
      {
        path: 'attendance',
        loadComponent: () => import('./member/features/attendance/attendance').then((m) => m.MemberAttendancePage),
      },
      {
        path: 'payments',
        loadComponent: () => import('./member/features/payments/payments').then((m) => m.MemberPayments),
      },
      {
        path: 'profile',
        loadComponent: () => import('./member/features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'security',
        loadComponent: () => import('./member/features/security/security').then((m) => m.Security),
      },
      {
        path: 'settings',
        loadComponent: () => import('./member/features/settings/settings').then((m) => m.Settings),
      },
    ],
  },
];
