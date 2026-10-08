import { Expense } from "./types";
export const mockExpenses: Expense[] = [
  {
    id: "EX-0184",
    category: "Diesel",
    amount: 24500,
    machine: "Excavator 01",
    vendor: "XYZ Fuels",
    details: "260 L",
    date: "24 September 2026",
  },
  {
    id: "EX-0183",
    category: "Labour",
    amount: 18000,
    machine: "Pit A",
    vendor: "Site crew",
    details: "12 workers",
    date: "24 September 2026",
  },
  {
    id: "EX-0182",
    category: "Repairs",
    amount: 15900,
    machine: "Excavator 02",
    vendor: "Deccan Engineering",
    details: "Hydraulic service",
    date: "24 September 2026",
  },
  {
    id: "EX-0181",
    category: "Transport",
    amount: 10000,
    machine: "TS09 AB 1234",
    vendor: "Ravi Transport",
    details: "Hyderabad trip",
    date: "24 September 2026",
  },
];
