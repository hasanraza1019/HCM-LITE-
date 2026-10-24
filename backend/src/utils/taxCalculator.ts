export function calculateIncomeTax(grossSalary: number): { annualGross: number; annualTax: number; monthlyTax: number } {
  const annualGross = grossSalary * 12;
  let annualTax = 0;

  if (annualGross <= 600000) {
    annualTax = 0;
  } else if (annualGross <= 1200000) {
    annualTax = (annualGross - 600000) * 0.05;
  } else if (annualGross <= 2400000) {
    annualTax = 30000 + (annualGross - 1200000) * 0.15;
  } else if (annualGross <= 3600000) {
    annualTax = 210000 + (annualGross - 2400000) * 0.25;
  } else {
    annualTax = 510000 + (annualGross - 3600000) * 0.35;
  }

  const monthlyTax = Math.round((annualTax / 12) * 100) / 100;
  return {
    annualGross,
    annualTax: Math.round(annualTax * 100) / 100,
    monthlyTax
  };
}

