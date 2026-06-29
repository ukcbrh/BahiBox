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

export const fallbackModules = [
  { 
    id: 'retail', 
    name: 'Retail POS', 
    description: 'Point of sale and inventory', 
    icon: 'ShoppingCart', 
    price: 49.00,
    features_free: ['Single User Access', 'Basic Billing', 'Up to 50 Products', 'Standard Support'],
    features_pro: ['Unlimited Users', 'Advanced Inventory & Alerts', 'Customer Loyalty Program', 'Public App Listing'],
    features_custom: ['Multi-store Management', 'Custom Reporting', 'Dedicated Account Manager', 'SLA Guarantee']
  },
  { 
    id: 'manufacturing', 
    name: 'Manufacturing', 
    description: 'Production and tracking', 
    icon: 'Factory', 
    price: 199.00,
    features_free: ['Basic Production Tracking', '1 Workshop', 'Limited Raw Materials'],
    features_pro: ['BOM Management', 'Labor Tracking', 'Automatic Stock Updates', 'Multiple Warehouses'],
    features_custom: ['Custom Machine Integration', 'Advanced Analytics', 'On-premises Deployment', 'API Access']
  },
  { 
    id: 'education', 
    name: 'Education', 
    description: 'School management', 
    icon: 'GraduationCap', 
    price: 149.00,
    features_free: ['Up to 100 Students', 'Basic Attendance', 'Fee Tracking'],
    features_pro: ['Smart Admissions', 'Dynamic Syllabus Tracker', 'Live Bus Tracking', 'Parents Portal'],
    features_custom: ['Multi-branch Management', 'Custom ERP Integration', 'Biometric Attendance', 'Dedicated Support']
  },
  { 
    id: 'healthcare', 
    name: 'Healthcare', 
    description: 'Clinic and patient management', 
    icon: 'Stethoscope', 
    price: 299.00,
    features_free: ['Basic OPD', 'Single Doctor', 'Limited Patient Records'],
    features_pro: ['Pharmacy Inventory', 'Lab Report Management', 'Bed Tracking', 'Online Appointments'],
    features_custom: ['Custom HIS Integration', 'NABH Compliance', 'Multi-specialty Setup', 'Dedicated Server']
  },
  { 
    id: 'hospitality', 
    name: 'Hospitality', 
    description: 'Hotel and restaurant', 
    icon: 'Hotel', 
    price: 99.00,
    features_free: ['Basic Table Management', 'Limited Menu Items', 'Simple Billing'],
    features_pro: ['Kitchen Display System (KDS)', 'Room Booking', 'Self-ordering Kiosk', 'Inventory Tracking'],
    features_custom: ['Custom Chain Management', 'Loyalty Program Integration', 'API Access', 'SLA Guarantee']
  },
  { 
    id: 'transport', 
    name: 'Transport', 
    description: 'Fleet and logistics', 
    icon: 'Truck', 
    price: 149.00,
    features_free: ['Basic Vehicle Tracking', 'Single Owner', 'Simple Trip Logs'],
    features_pro: ['Fleet Tracking', 'Driver Wallet', 'Part-load Management', 'Expense Tracking'],
    features_custom: ['Custom GPS Integration', 'Multi-branch Operations', 'Advanced Analytics', 'Dedicated Support']
  },
  { 
    id: 'services', 
    name: 'Services', 
    description: 'Service and booking', 
    icon: 'Wrench', 
    price: 49.00,
    features_free: ['Basic Appointments', 'Single Service Provider', 'Simple Invoicing'],
    features_pro: ['Online Booking', 'Customer Management', 'Payment Integration', 'Public App Listing'],
    features_custom: ['Custom Agency Management', 'Staff Scheduling', 'API Access', 'SLA Guarantee']
  },
  { 
    id: 'agriculture', 
    name: 'Agriculture', 
    description: 'Farm and crop management', 
    icon: 'Tractor', 
    price: 79.00,
    features_free: ['Weather Alerts', 'Basic Crop Diary', 'Limited Expense Tracking'],
    features_pro: ['Labor Payment Management', 'Smart Crop Calendar', 'KCC/AIF Loan Tracking', 'Inventory Management'],
    features_custom: ['FPO/FPC Management', 'Custom Supply Chain', 'Advanced Analytics', 'Dedicated Account Manager']
  }
];
