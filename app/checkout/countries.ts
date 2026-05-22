export interface Country {
  iso: string;
  name: string;
  dial: string;
}

/** Country list — exact ordering from the source HTML's AF_COUNTRIES. */
export const COUNTRIES: Country[] = [
  { iso: "in", name: "India", dial: "+91" },
  { iso: "us", name: "United States", dial: "+1" },
  { iso: "gb", name: "United Kingdom", dial: "+44" },
  { iso: "ca", name: "Canada", dial: "+1" },
  { iso: "au", name: "Australia", dial: "+61" },
  { iso: "ae", name: "UAE", dial: "+971" },
  { iso: "sa", name: "Saudi Arabia", dial: "+966" },
  { iso: "sg", name: "Singapore", dial: "+65" },
  { iso: "my", name: "Malaysia", dial: "+60" },
  { iso: "nz", name: "New Zealand", dial: "+64" },
  { iso: "za", name: "South Africa", dial: "+27" },
  { iso: "de", name: "Germany", dial: "+49" },
  { iso: "fr", name: "France", dial: "+33" },
  { iso: "it", name: "Italy", dial: "+39" },
  { iso: "es", name: "Spain", dial: "+34" },
  { iso: "nl", name: "Netherlands", dial: "+31" },
  { iso: "se", name: "Sweden", dial: "+46" },
  { iso: "ch", name: "Switzerland", dial: "+41" },
  { iso: "ie", name: "Ireland", dial: "+353" },
  { iso: "bd", name: "Bangladesh", dial: "+880" },
  { iso: "pk", name: "Pakistan", dial: "+92" },
  { iso: "lk", name: "Sri Lanka", dial: "+94" },
  { iso: "np", name: "Nepal", dial: "+977" },
  { iso: "jp", name: "Japan", dial: "+81" },
  { iso: "kr", name: "South Korea", dial: "+82" },
  { iso: "cn", name: "China", dial: "+86" },
  { iso: "hk", name: "Hong Kong", dial: "+852" },
  { iso: "ph", name: "Philippines", dial: "+63" },
  { iso: "id", name: "Indonesia", dial: "+62" },
  { iso: "th", name: "Thailand", dial: "+66" },
  { iso: "qa", name: "Qatar", dial: "+974" },
  { iso: "kw", name: "Kuwait", dial: "+965" },
  { iso: "om", name: "Oman", dial: "+968" },
  { iso: "bh", name: "Bahrain", dial: "+973" },
  { iso: "br", name: "Brazil", dial: "+55" },
  { iso: "mx", name: "Mexico", dial: "+52" },
  { iso: "eg", name: "Egypt", dial: "+20" },
  { iso: "ng", name: "Nigeria", dial: "+234" },
  { iso: "ke", name: "Kenya", dial: "+254" },
];
