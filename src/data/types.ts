export type Status =
  "PAID" | "PARTIAL" | "CREDIT" | "LOADED" | "DISPATCHED" | "DELIVERED";
export interface Production {
  id: string;
  date: string;
  pit: string;
  material: string;
  grade: string;
  shift: string;
  quantity: number;
  supervisor: string;
}
export interface Sale {
  id: string;
  customer: string;
  material: string;
  quantity: number;
  amount: number;
  status: Status;
}
export interface Dispatch extends Sale {
  vehicle: string;
  driver: string;
  destination: string;
}
export interface Expense {
  id: string;
  category: string;
  amount: number;
  machine: string;
  vendor: string;
  details: string;
  date: string;
}
export interface Customer {
  name: string;
  sales: number;
  received: number;
  outstanding: number;
}
export interface Stock {
  material: string;
  grade: string;
  quantity: number;
}
