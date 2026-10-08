export interface Field {
  key: string;
  label: string;
  initial?: string;
  options?: string[];
  number?: boolean;
}
const material = ["Black Granite", "Grey Granite"],
  grade = ["Grade A", "Grade B"],
  customers = [
    "Sri Balaji Granites",
    "Sri Venkateswara Granites",
    "SRK Granites",
    "Balaji Stone Mart",
  ];
export const forms: Record<
  string,
  { title: string; button: string; fields: Field[] }
> = {
  production: {
    title: "Add Production",
    button: "Save Production",
    fields: [
      {
        key: "date",
        label: "Date",
        options: ["24 September 2026", "23 September 2026"],
      },
      { key: "pit", label: "Quarry / Pit", options: ["Pit A", "Pit B"] },
      { key: "material", label: "Material", options: material },
      { key: "grade", label: "Grade", options: grade },
      { key: "quantity", label: "Quantity (Tons)", number: true },
      {
        key: "machine",
        label: "Machine",
        options: ["Excavator 01", "Excavator 02"],
      },
      {
        key: "shift",
        label: "Shift",
        options: ["Morning", "Afternoon", "Night"],
      },
      {
        key: "supervisor",
        label: "Supervisor",
        options: ["Ramesh", "Suresh", "Venkat"],
      },
    ],
  },
  sale: {
    title: "New Sale",
    button: "Save Sale",
    fields: [
      { key: "customer", label: "Customer", options: customers },
      { key: "material", label: "Material", options: material },
      { key: "grade", label: "Grade", options: grade },
      {
        key: "quantity",
        label: "Quantity (Tons)",
        initial: "20",
        number: true,
      },
      { key: "rate", label: "Rate / Ton (₹)", initial: "4200", number: true },
      {
        key: "payment",
        label: "Payment Type",
        options: ["Cash", "UPI", "Bank", "Credit"],
      },
    ],
  },
  dispatch: {
    title: "New Dispatch",
    button: "Generate Challan",
    fields: [
      { key: "customer", label: "Customer", options: customers },
      {
        key: "order",
        label: "Sale / Order",
        options: ["SO-1024", "SO-1023", "SO-1022"],
      },
      { key: "vehicle", label: "Vehicle Number", initial: "TS09 AB 1234" },
      { key: "driver", label: "Driver Name", initial: "Ravi" },
      { key: "material", label: "Material", options: material },
      {
        key: "quantity",
        label: "Quantity (Tons)",
        initial: "18.5",
        number: true,
      },
      { key: "destination", label: "Destination", initial: "Hyderabad" },
    ],
  },
  expense: {
    title: "Add Expense",
    button: "Save Expense",
    fields: [
      {
        key: "date",
        label: "Date",
        options: ["24 September 2026", "23 September 2026"],
      },
      {
        key: "category",
        label: "Category",
        options: [
          "Diesel",
          "Labour",
          "Machinery",
          "Repairs",
          "Blasting",
          "Transport",
          "Electricity",
          "Other",
        ],
      },
      { key: "amount", label: "Amount (₹)", number: true },
      {
        key: "machine",
        label: "Machine / Vehicle",
        options: [
          "Excavator 01",
          "Excavator 02",
          "TS09 AB 1234",
          "Not applicable",
        ],
      },
      { key: "vendor", label: "Supplier / Vendor", initial: "XYZ Fuels" },
      { key: "details", label: "Quantity / Details", initial: "260 L" },
    ],
  },
};
