import { ServiceCategory } from '../types';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'washing_machine', label: 'Washing Machine Repair', icon: 'settings-outline' },
  { id: 'ac', label: 'AC Repair', icon: 'snow-outline' },
  { id: 'refrigerator', label: 'Refrigerator Repair', icon: 'cube-outline' },
  { id: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
  { id: 'electrical', label: 'Electrical', icon: 'flash-outline' },
  { id: 'water_heater', label: 'Water Heater Repair', icon: 'water-outline' },
  { id: 'microwave', label: 'Microwave Repair', icon: 'restaurant-outline' },
  { id: 'carpentry', label: 'Carpentry', icon: 'hammer-outline' },
  { id: 'painting', label: 'Painting', icon: 'brush-outline' },
  { id: 'other', label: 'Other', icon: 'construct-outline' },
];

// export const CATEGORY_ICONS: Record<ServiceCategory, string> = {
//   'AC Repair': '❄️',
//   'Refrigerator Repair': '🧊',
//   'Plumbing': '🔧',
//   'Electrical': '⚡',
//   'Washing Machine': '🧼',
//   'Water Heater': '💧',
//   'Microwave': '🔥',
//   'Other': '🛠️',
// };
