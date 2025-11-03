import { ServiceCategory } from '../types';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'AC Repair',
  'Refrigerator Repair',
  'Plumbing',
  'Electrical',
  'Washing Machine',
  'Water Heater',
  'Microwave',
  'Other',
];

export const CATEGORY_ICONS: Record<ServiceCategory, string> = {
  'AC Repair': '❄️',
  'Refrigerator Repair': '🧊',
  'Plumbing': '🔧',
  'Electrical': '⚡',
  'Washing Machine': '🧼',
  'Water Heater': '💧',
  'Microwave': '🔥',
  'Other': '🛠️',
};
