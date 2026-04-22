// Canonical enums from 05-schema-appendix.md.
// Used for selects, chips, filters, and validation across entity workspaces.

export const RELATIONSHIP_TYPES = [
  "Client","Prospect","Partner","Collaborator","Team","Network","Funder",
  "Friend","Referral Source","Advisor/Mentor","Vendor","Legal/Professional",
] as const;

export const RELATIONSHIP_STATUS = [
  "Active","Nurturing","Waiting on Them","On Hold","Inactive",
] as const;

export const PIPELINE_STAGE = [
  "1. Awareness","2. Interest","3. Proposal Sent","4. Active Engagement",
  "5. Client","On Hold","Inactive",
] as const;

export const MIRROR_STATUS = ["Not Started","Scheduled","Completed","N/A"] as const;

export const ACTIVE_SERVICES = ["Mirror","Map","Machine","SweetSync","SweetConnect"] as const;

export const TOUCHPOINT_TYPES = [
  "Portal","Email","Call","Meeting","Resource","One-Pager","Contract","Session",
] as const;

export const SESSION_SERVICE = ["Mirror","Map","Machine","SweetSync"] as const;
export const DELIVERY_VARIATION = ["Map","Machine","SweetSync","Mirror"] as const;

export const SWEETCYCLE_PHASE = ["Seed","Synthesize","Session","Sync","Ship"] as const;

export const SEED_STATUS = [
  "⏳ Pending","✅ Submitted","❌ Missed — cancelled per contract",
] as const;
export const SYNC_STATUS = [
  "Not Yet","Presented","Approved — scope locked","Changes Requested — new session required",
] as const;
export const SHIP_STATUS = [
  "Not Yet","In Production","Delivered","Revision Requested","Revision Delivered","Accepted",
] as const;

export const PROGRESSION_STATE = [
  "Not Started","Open","Pre-filled","Provisionally Satisfied",
  "Completed by you","Completed with Liz","Completed for you",
  "Confirmed Complete","Skipped","Reopened","Superseded",
] as const;

export const SOURCE_OF_ADVANCEMENT = [
  "Seed","Mirror","Map Session","Machine Build","SweetSync Spark","SweetSync Quest",
  "Uploaded Material","Session Judgment","Observation","System Extract","Client Self-Report",
] as const;

export const STATE_OF_THE_THING = [
  "Identified","Defined","Designed","Built","Delivered","Adopted","Sustained",
] as const;

export const INTELLIGENCE_CONFIDENCE = [
  "Not Yet Verified","Inferred","Observed","Verified","Confirmed",
] as const;

export const QUALITY_STATUS = ["Draft","Tested","Proven","Canonical"] as const;
export const SPEC_STATUS = ["Emerging","Draft","Proven","Refined"] as const;
export const MATURITY_LEVEL = [
  "L1 Lacking","L2 Learning","L3 Launching","L4 Leveraging","L5 Leading",
] as const;
export const SPARK_TYPE = [
  "Question","Creation","Definition","Decision","Reflection","Action",
] as const;

export const PROJECT_OWNER = ["Lizzy","Wisdom","Shared","External"] as const;
export const TASK_OWNER = ["Lizzy","Wisdom","Erica","Dave","JF","Brittney","External"] as const;

export const PROJECT_PRIORITY = ["🔴 Critical","🟡 High","🟢 Normal","⚪ Someday"] as const;
export const TASK_PRIORITY = ["🔴 Urgent","🟡 High","🟢 Normal"] as const;
export const SPRINT = ["This Week","Next Up","Backlog","Blocked","Someday"] as const;
export const PROJECT_TYPE = ["Build","Business Dev","Content","Legal","Operations","Admin","Research"] as const;
export const TASK_STATUS = ["Not Started","In Progress","Waiting","Blocked","Done"] as const;
export const PROJECT_STATUS = ["Active","On Hold","Blocked","Done","Archived"] as const;

export const EFFORT = ["⚡ 15 min","🕐 1 hr","🕒 Half day","📅 Multi-day"] as const;
export const RECURRING_CADENCE = ["Daily","Weekly","Biweekly","Monthly","Quarterly","Annually"] as const;

export const CAMPAIGN_TYPE = ["Revenue","Partnership","Platform Build","Legal & Ops","Content","Funding"] as const;

export const DOMAINS = [
  "D1 Strategy & Positioning","D2 Client Segmentation","D3 Marketing & Brand",
  "D4 Outreach & Biz Dev","D5 Sales & Discovery","D6 Onboarding & Intake",
  "D7 Service Delivery","D8 Review & Value Proof","D9 Communications",
  "D10 Compliance/Legal","D11 Finance & Pricing","D12 Funding & Capital",
  "D13 Talent & Vendors","D14 Technology & Tools","D15 Security & Privacy",
  "D16 Analytics & CI","D17 Education & Training","D18 Templates & KB",
  "D19 Partnerships","D20 Support & Success","D21 Roadmap & Innovation","D22 Monetization",
] as const;

export const FRAMEWORKS = [
  "F1 OCDA","F2 Gestalt","F3 4Ds","F4 5Ps","F5 3Cs","F6 5Ls","F7 Co-Evolution","F8 Rhetorical",
] as const;

export const BIZZYBOTS = [
  "SweetBot","StratBot","BizBot","TechBot","DataBits",
  "Securitron","GroundLink","LifeOptimizer","PromptMaster",
] as const;

export const DELEGATION_DONE_BY = ["Liz","Wisdom","System","External","Nobody yet"] as const;
export const DELEGATION_TARGET = [
  "Wisdom","Jayden","Claude / Skill","Notion Automation","External Hire","Liz only — keep",
] as const;
export const DELEGATION_TYPE = [
  "Full handoff","Assisted — Liz reviews","Template / system","Not yet — needs spec first",
] as const;
export const DELEGATION_EFFORT = [
  "⚡ Quick — just do it","🕐 Needs a brief","📅 Needs a system built","🚫 Not ready yet",
] as const;

export const DOCUMENT_TYPE = [
  "Contract","Marketing","Technical Spec","Newsletter","Portal","Skill File","Template","Research",
] as const;
export const DOCUMENT_STATUS = [
  "🔨 Needs Building","🔄 In Progress","👁️ Needs Review","✅ Current","🗄️ Archived",
] as const;
export const TONE_VOICE = [
  "SweetBot Standard","Enterprise / Fund Company","Legal / Formal","Advisor-to-Advisor","Internal / Team",
] as const;

export const PERSONA_SECTOR = [
  "Wealth Management","Insurance","Family Office","Tech Consulting",
  "Accounting & Tax","Legal","Multi-Discipline","Other",
] as const;
export const PERSONA_STRUCTURE = [
  "Solo independent","Independent team","Exec / Leader at firm",
  "Employee managing own book","Multi-discipline firm","Enterprise / Institutional",
] as const;
export const PERSONA_AUTONOMY = [
  "Fully autonomous","Self-directed within firm","Leadership with authority","Needs organizational approval",
] as const;
export const PERSONA_REGISTRATION = [
  "IIROC","MFDA","Insurance licensed — advisor","Insurance licensed — broker",
  "Exempt market dealer","Unregistered professional","Multiple registrations",
] as const;

export const OUTCOME_TYPE = [
  "Time Saved","Revenue Increased","Efficiency Gained",
  "Satisfaction Improved","Cost Reduced","Quality Improved",
] as const;

export const DECISION_STATUS = ["Open","Decided","Superseded"] as const;

// Phase 2.8 — funnel + engagement
export const AWARENESS_TIER = [
  "Unaware","Problem-aware","Solution-aware","Product-aware","Most-aware",
] as const;
export const RELATIONSHIP_TEMPERATURE = ["Warm","Cool","Cold","Paused"] as const;
export const DRIFT_RISK = ["None","Low","Medium","High"] as const;
export const ENGAGEMENT_PLAN_STATUS = [
  "Proposed","Accepted","In Progress","Completed","Cancelled",
] as const;
export const ENGAGEMENT_SERVICE_TYPE = [
  "Mirror","Map","Machine","SweetSync","SweetConnect",
] as const;
export const ENGAGEMENT_SERVICE_STATUS = [
  "Not Started","Active","Paused","Completed","Renewed","Cancelled",
] as const;
export const SESSION_PHASE = ["Pre-Engagement","Deliverable","Follow-up"] as const;
export const REUSABILITY_TIER = ["One-Time","Relationship","Org","System"] as const;

// Phase 2.10f — Service shape
export const SERVICE_PACKAGE = [
  "Mirror Only","Mirror + Machine","Machine Only","Map","None",
] as const;
export type ServicePackage = (typeof SERVICE_PACKAGE)[number];

export const SERVICE_PACKAGE_BADGE: Record<ServicePackage, string> = {
  "Mirror Only": "Mirror",
  "Mirror + Machine": "M+M",
  "Machine Only": "Machine",
  "Map": "Map",
  "None": "—",
};
