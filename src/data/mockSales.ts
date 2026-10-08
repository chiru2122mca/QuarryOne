import { Sale } from "./types";
export const mockSales: Sale[] = [
  {
    id: "SO-1024",
    customer: "Sri Venkateswara Granites",
    material: "Black Granite",
    quantity: 20,
    amount: 84000,
    status: "CREDIT",
  },
  {
    id: "SO-1023",
    customer: "Balaji Stone Mart",
    material: "Grey Granite",
    quantity: 28,
    amount: 105000,
    status: "PAID",
  },
  {
    id: "SO-1022",
    customer: "SRK Granites",
    material: "Black Granite",
    quantity: 32,
    amount: 136000,
    status: "PARTIAL",
  },
  {
    id: "SO-1021",
    customer: "Sri Balaji Granites",
    material: "Black Granite",
    quantity: 25,
    amount: 100000,
    status: "PAID",
  },
];
