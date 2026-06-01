// Mock data used when no real backend data is available (logged-out demo mode).
// When a candidate is logged in, real backend data is merged on top of this shape
// in Workspace.tsx.

export type EmperUser = {
  name: string;
  role: string;
  company: string;
  location: string;
  publicProfile: boolean;
  yearsExp: number;
  initials?: string;
  email?: string;
};

export type EmperShipped = {
  title: string;
  where: string;
  blurb: string;
};

export type EmperIntro = {
  id: number | string;
  company: string;
  stage: string;
  funding: string;
  who: string;
  whoTitle: string;
  reasons: string[];
  sent: string;
  logoColor: string;
  new: boolean;
};

export type EmperDocument = {
  name: string;
  type: "resume" | "linkedin" | "sop" | "blog" | "github" | "other";
  date: string;
  size: string;
  attrs: number;
  attrList: string[];
};

export type EmperEmail = {
  connected: boolean;
  address: string;
  provider: string;
  lastSync: string;
  threadsScanned: number;
  threadsRelevant: number;
};

export type EmperTrack = {
  id: number;
  company: string;
  person: string;
  personRole: string;
  logoColor: string;
  source: string;
  status: "needs-you" | "stale" | "scheduled" | "their-court";
  lastEvent: string;
  lastEventAt: string;
  threadCount: number;
  kira: string;
  preview: Array<{ from: string; at: string; text: string }>;
};

export type EmperDiscovery = {
  id: number;
  company: string;
  person: string;
  personRole: string;
  logoColor: string;
  arrived: string;
  kiraVerdict: "match" | "off-criteria" | "noise";
  kira: string;
  snippet: string;
};

export type EmperChat = {
  id: number;
  title: string;
  date: string;
  duration: string;
  summary: string;
  transcript: Array<{ from: "kira" | "user"; text: string }>;
};

export type EmperData = {
  user: EmperUser;
  gapQuestions: number;
  arc: { body: string; sources: string[] };
  howIWork: { body: string; sources: string[] };
  behavioralProfile: { body: string; sources: string[] } | null;
  shipped: EmperShipped[];
  shippedSources: string[];
  optimizingFor: { body: string; sources: string[] };
  intros: EmperIntro[];
  documents: EmperDocument[];
  email: EmperEmail;
  tracks: EmperTrack[];
  discoveries: EmperDiscovery[];
  chats: EmperChat[];
};

export const MOCK: EmperData = {
  user: {
    name: "You",
    role: "",
    company: "",
    location: "",
    publicProfile: false,
    yearsExp: 0,
    initials: "U",
  },

  gapQuestions: 0,

  arc: { body: "", sources: [] },

  howIWork: { body: "", sources: [] },

  behavioralProfile: null,

  shipped: [],
  shippedSources: [],

  optimizingFor: { body: "", sources: [] },

  intros: [],

  documents: [],

  email: {
    connected: false,
    address: "",
    provider: "",
    lastSync: "",
    threadsScanned: 0,
    threadsRelevant: 0,
  },

  tracks: [],

  discoveries: [],

  chats: [],
};
