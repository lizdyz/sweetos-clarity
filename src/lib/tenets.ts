// Canonical 22-tenet catalog grouped by category.
// Tenets are the industry best-practice anchors that complement the 22 universal Domains.

export type TenetCategory = "Foundation" | "Specialization" | "Advanced" | "Mastery";

export interface Tenet {
  code: string;
  name: string;
  category: TenetCategory;
  description: string;
}

export const TENETS: Tenet[] = [
  { code: "F1", name: "Strategic Vision & Purpose", category: "Foundation", description: "Defining purpose, vision, and strategic direction for the practice" },
  { code: "F2", name: "Leadership & Team Development", category: "Foundation", description: "Building and leading high-performing teams" },
  { code: "F3", name: "Operational Excellence", category: "Foundation", description: "Creating efficient, scalable, and repeatable operations" },
  { code: "F4", name: "Financial Mastery", category: "Foundation", description: "Mastering business financial management and planning" },
  { code: "F5", name: "Marketing & Positioning", category: "Foundation", description: "Positioning practice and building market presence" },
  { code: "F6", name: "Sales & Business Development", category: "Foundation", description: "Developing business and converting prospects to clients" },
  { code: "F7", name: "Client Experience Design", category: "Foundation", description: "Designing exceptional client experiences" },
  { code: "F8", name: "Risk Management & Compliance", category: "Foundation", description: "Managing risk and maintaining compliance" },
  { code: "S9", name: "Client Discovery & Needs Analysis", category: "Specialization", description: "Deeply understanding client needs, goals, and context" },
  { code: "S10", name: "Financial Planning Mastery", category: "Specialization", description: "Mastering comprehensive financial planning" },
  { code: "S11", name: "Investment Philosophy & Strategy", category: "Specialization", description: "Developing coherent investment philosophy and strategy" },
  { code: "S12", name: "Estate Planning Excellence", category: "Specialization", description: "Excelling at estate planning and wealth transfer" },
  { code: "S13", name: "Tax Planning Integration", category: "Specialization", description: "Integrating tax planning into all advice" },
  { code: "S14", name: "Insurance Strategy", category: "Specialization", description: "Strategic use of insurance in planning" },
  { code: "S15", name: "Business Succession Planning", category: "Specialization", description: "Planning for business owner transitions and succession" },
  { code: "A16", name: "Behavioral Finance Application", category: "Advanced", description: "Applying behavioral finance principles to client work" },
  { code: "A17", name: "Data Intelligence & Analytics", category: "Advanced", description: "Leveraging data and analytics for insights" },
  { code: "A18", name: "Networks & Strategic Partnerships", category: "Advanced", description: "Building strategic partnerships and networks" },
  { code: "A19", name: "Innovation & Adaptation", category: "Advanced", description: "Driving innovation and adapting to change" },
  { code: "A20", name: "Communication & Client Education", category: "Advanced", description: "Communicating complex ideas and educating clients" },
  { code: "M21", name: "Crisis Leadership", category: "Mastery", description: "Leading during crisis and uncertainty" },
  { code: "M22", name: "Legacy & Industry Contribution", category: "Mastery", description: "Contributing to profession and leaving lasting legacy" },
];

export const TENETS_BY_CATEGORY: Record<TenetCategory, Tenet[]> = {
  Foundation: TENETS.filter((t) => t.category === "Foundation"),
  Specialization: TENETS.filter((t) => t.category === "Specialization"),
  Advanced: TENETS.filter((t) => t.category === "Advanced"),
  Mastery: TENETS.filter((t) => t.category === "Mastery"),
};
