export const cents_to_rupees_str = (c) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(c / 100);
