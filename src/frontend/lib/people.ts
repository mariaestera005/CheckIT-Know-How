// Demo company hierarchy for the "Who to ask" page (same demo colleagues as Outlook & Teams).
export type Person = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  badge?: string;
  managerId: string | null;
  topics: string[];
};

export const PEOPLE: Person[] = [
  {
    id: "ana",
    name: "Ana Georgescu",
    role: "Head of Company",
    email: "ana.georgescu@contoso-demo.com",
    phone: "+40 721 100 001",
    badge: "👑 Big boss",
    managerId: null,
    topics: ["Company direction", "Strategy", "Escalations", "Big decisions"],
  },
  {
    id: "elena",
    name: "Elena Popescu",
    role: "Product Manager",
    email: "elena.popescu@contoso-demo.com",
    phone: "+40 721 100 002",
    managerId: "ana",
    topics: ["Product roadmap", "Releases", "Handbook changes", "Priorities"],
  },
  {
    id: "andrei",
    name: "Andrei Dumitru",
    role: "Mobile Engineer",
    email: "andrei.dumitru@contoso-demo.com",
    phone: "+40 721 100 003",
    managerId: "elena",
    topics: ["Mobile apps", "iOS", "Android", "App bugs"],
  },
  {
    id: "ioana",
    name: "Ioana Stan",
    role: "Backend Engineer",
    email: "ioana.stan@contoso-demo.com",
    phone: "+40 721 100 004",
    managerId: "elena",
    topics: ["APIs", "Data", "Integrations", "Security"],
  },
  {
    id: "mihai",
    name: "Mihai Ionescu",
    role: "Hardware Lead",
    email: "mihai.ionescu@contoso-demo.com",
    phone: "+40 721 100 005",
    managerId: "ana",
    topics: ["Laptops", "Devices", "Device management", "Equipment"],
  },
  {
    id: "radu",
    name: "Radu Marin",
    role: "Office Manager",
    email: "radu.marin@contoso-demo.com",
    phone: "+40 721 100 006",
    managerId: "ana",
    topics: ["Office", "Travel", "Onboarding", "Expenses"],
  },
  {
    id: "cristina",
    name: "Cristina Vasile",
    role: "HR Specialist",
    email: "cristina.vasile@contoso-demo.com",
    phone: "+40 721 100 007",
    managerId: "radu",
    topics: ["Benefits", "Time off", "Payroll", "Hiring"],
  },
];

export function reportsOf(id: string | null) {
  return PEOPLE.filter((p) => p.managerId === id);
}

export function matchesPerson(p: Person, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [p.name, p.role, ...p.topics].some((t) => t.toLowerCase().includes(s));
}
