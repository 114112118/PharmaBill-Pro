/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Medicine {
  id: string;
  name: string;
  unitPrice: number;
  boxPrice: number;
  lastUpdated: number;
}

export interface BillItem {
  id: string;
  medicineId: string;
  name: string;
  priceType: 'unit' | 'box';
  price: number;
  quantity: number;
  total: number;
}

export interface Bill {
  id: string;
  items: BillItem[];
  discount: number;
  discountType: 'percentage' | 'flat';
  subtotal: number;
  totalAmount: number;
  customerName?: string;
  date: number;
}

export interface PharmacySettings {
  pharmacyName: string;
  address?: string;
  phone?: string;
  taxNumber?: string;
}
