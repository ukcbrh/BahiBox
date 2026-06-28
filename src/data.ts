import { ShoppingCart, Factory, GraduationCap, Stethoscope, Utensils, Truck, Wrench, Sprout, Smartphone } from 'lucide-react';

export const modulesData = [
  { 
    id: 'retail', 
    title: 'Retail & POS',
    description: 'Perfect retail machine with superfast billing, inventory unit management, and scan-and-go self-checkout.',
    icon: ShoppingCart, 
    color: 'text-blue-500', 
    bg: 'bg-blue-50' 
  },
  { 
    id: 'manufacturing', 
    title: 'Manufacturing ERP',
    description: 'End-to-end tracking from raw materials (BOM) to finished goods, labor management, and automatic stock inventory system.',
    icon: Factory, 
    color: 'text-purple-500', 
    bg: 'bg-purple-50' 
  },
  { 
    id: 'education', 
    title: 'Education Management',
    description: 'Smart student admissions, dynamic syllabus tracker, live bus tracking, and transparent fee counters for parents.',
    icon: GraduationCap, 
    color: 'text-orange-500', 
    bg: 'bg-orange-50' 
  },
  { 
    id: 'healthcare', 
    title: 'Healthcare & Hospital',
    description: 'Complete hospital management from OPD registration to pharmacy, lab reports, and live bed tracking.',
    icon: Stethoscope, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-50' 
  },
  { 
    id: 'hospitality', 
    title: 'Hotel & Restaurant (Hospitality)',
    description: 'Room booking, Kitchen Display System (KDS), smart self-ordering kiosks, and auto-consumption tracking.',
    icon: Utensils, 
    color: 'text-red-500', 
    bg: 'bg-red-50' 
  },
  { 
    id: 'transport', 
    title: 'Transport & Logistics',
    description: 'Fleet tracking, driver wallet, part-load management, and precise trip expense calculation.',
    icon: Truck, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-50' 
  },
  { 
    id: 'services', 
    title: 'Daily Services',
    description: 'Appointment and billing management for professionals like plumbers, mechanics, lawyers, or event planners.',
    icon: Wrench, 
    color: 'text-cyan-500', 
    bg: 'bg-cyan-50' 
  },
  { 
    id: 'agriculture', 
    title: 'Agri Management (Agri-Tech)',
    description: 'Weather alerts for farmers, labor payments, smart crop calendars, and comprehensive KCC/AIF loan tracking.',
    icon: Sprout, 
    color: 'text-green-500', 
    bg: 'bg-green-50' 
  },
];

export const publicAppFeature = {
  id: 'BahiBox Public App',
  title: 'BahiBox Public App',
  description: 'A master consumer app for the general public—where they can shop locally, search for jobs, book cabs, and handle daily chores.',
  icon: Smartphone,
  color: 'text-primary',
  bg: 'bg-primary/10'
};

export const pricingData: Record<string, { free: string[], pro: string[], custom: string[] }> = {
  'retail': {
    free: ['Single User Access', 'Basic Billing', 'Up to 50 Products', 'Standard Support'],
    pro: ['Unlimited Users', 'Advanced Inventory & Alerts', 'Customer Loyalty Program', 'Public App Listing'],
    custom: ['Multi-store Management', 'Custom Reporting', 'Dedicated Account Manager', 'SLA Guarantee']
  },
  'manufacturing': {
    free: ['Basic Production Tracking', '1 Workshop', 'Limited Raw Materials'],
    pro: ['BOM Management', 'Labor Tracking', 'Automatic Stock Updates', 'Multiple Warehouses'],
    custom: ['Custom Machine Integration', 'Advanced Analytics', 'On-premises Deployment', 'API Access']
  },
  'education': {
    free: ['Up to 100 Students', 'Basic Attendance', 'Fee Tracking'],
    pro: ['Smart Admissions', 'Dynamic Syllabus Tracker', 'Live Bus Tracking', 'Parents Portal'],
    custom: ['Multi-branch Management', 'Custom ERP Integration', 'Biometric Attendance', 'Dedicated Support']
  },
  'healthcare': {
    free: ['Basic OPD', 'Single Doctor', 'Limited Patient Records'],
    pro: ['Pharmacy Inventory', 'Lab Report Management', 'Bed Tracking', 'Online Appointments'],
    custom: ['Custom HIS Integration', 'NABH Compliance', 'Multi-specialty Setup', 'Dedicated Server']
  },
  'hospitality': {
    free: ['Basic Table Management', 'Limited Menu Items', 'Simple Billing'],
    pro: ['Kitchen Display System (KDS)', 'Room Booking', 'Self-ordering Kiosk', 'Inventory Tracking'],
    custom: ['Custom Chain Management', 'Loyalty Program Integration', 'API Access', 'SLA Guarantee']
  },
  'transport': {
    free: ['Basic Vehicle Tracking', 'Single Owner', 'Simple Trip Logs'],
    pro: ['Fleet Tracking', 'Driver Wallet', 'Part-load Management', 'Expense Tracking'],
    custom: ['Custom GPS Integration', 'Multi-branch Operations', 'Advanced Analytics', 'Dedicated Support']
  },
  'services': {
    free: ['Basic Appointments', 'Single Service Provider', 'Simple Invoicing'],
    pro: ['Online Booking', 'Customer Management', 'Payment Integration', 'Public App Listing'],
    custom: ['Custom Agency Management', 'Staff Scheduling', 'API Access', 'SLA Guarantee']
  },
  'agriculture': {
    free: ['Weather Alerts', 'Basic Crop Diary', 'Limited Expense Tracking'],
    pro: ['Labor Payment Management', 'Smart Crop Calendar', 'KCC/AIF Loan Tracking', 'Inventory Management'],
    custom: ['FPO/FPC Management', 'Custom Supply Chain', 'Advanced Analytics', 'Dedicated Account Manager']
  }
};
