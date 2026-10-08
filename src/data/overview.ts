export const overview = {
  production: 125,
  dispatch: 92,
  sales: 425000,
  expenses: 68400,
  outstanding: 875000,
  stock: 2840,
  monthSales: 1245000,
  monthDispatch: 1020,
};
export const money = (n: number) => "₹" + n.toLocaleString("en-IN");
export const lakh = (n: number) => "₹" + (n / 100000).toFixed(2) + " L";
export const reportNames = [
  "Production Report",
  "Sales Report",
  "Dispatch Report",
  "Stock Report",
  "Expense Report",
  "Customer Statement",
  "Quarry-wise Profitability",
];
