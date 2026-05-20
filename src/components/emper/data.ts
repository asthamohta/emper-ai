// Mock data used when no real backend data is available (logged-out demo mode).
// When a candidate is logged in, real backend data is merged on top of this shape
// in Workspace.tsx (see selfFromGoals()).

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
    name: "Alex Chen",
    role: "Senior Engineer, Infrastructure",
    company: "Ramp",
    location: "Brooklyn, NY",
    publicProfile: true,
    yearsExp: 5,
    initials: "AC",
  },

  gapQuestions: 3,

  arc: {
    body: `Started out doing backend at a Series B fintech right out of CMU, then spent two years at Stripe on the Payments Foundations team — mostly idempotency, sharding, the unglamorous stuff that holds everything else up. Left Stripe in late 2023 to join Ramp because I wanted to be closer to product surface area and stop maintaining systems I didn't get to shape. Currently leading the agentic-tools infrastructure team — basically the plumbing that lets product teams ship LLM features without setting money on fire.`,
    sources: ["resume.pdf", "linkedin-export.zip", "conversation with Kira · Mar 14"],
  },

  howIWork: {
    body: `Lives in the terminal. Vim + tmux, no IDE. Treats Claude Code as a real collaborator — pairs with it on plumbing, reviews its diffs like a junior's, but writes anything load-bearing by hand. Strong opinions about types as documentation. Has a low tolerance for meetings that could be a Linear comment, and will quietly skip them.`,
    sources: ["sop.md", "conversation with Kira · Mar 22"],
  },

  shipped: [
    {
      title: "Idempotent payment routing layer",
      where: "Stripe, 2022",
      blurb:
        "Rebuilt the dispatch path that handles ~14% of global card volume. Cut p99 latency from 380ms to 92ms; zero duplicate-charge incidents since rollout.",
    },
    {
      title: "Agentic tool runtime",
      where: "Ramp, 2024–now",
      blurb:
        "Designed the sandboxed tool-execution layer the AI expense agent runs against. Handles 2M+ tool calls/day, signed audit trail per call, supports custom MCP servers per workspace.",
    },
    {
      title: "policykit (open source)",
      where: "Side project, 2023",
      blurb:
        "Tiny Go library for declarative IAM policy diffing. 2.1k stars; used internally at three companies I know of.",
    },
  ],
  shippedSources: ["resume.pdf", "github.com/alxchen"],

  optimizingFor: {
    body: `Wants to be employee #15–60 at an AI-first US startup with a real product, not a research org. Specifically interested in infrastructure-shaped problems where the AI is load-bearing — eval pipelines, agent runtimes, retrieval at scale. Will not take another rotation through pure ML research. Will not relocate from NYC. Comp matters but is secondary to founders he respects and a codebase he won't be embarrassed by.`,
    sources: ["conversation with Kira · Mar 14", "conversation with Kira · Apr 02"],
  },

  intros: [
    {
      id: 1,
      company: "Modal",
      stage: "Series A",
      funding: "$16M, a16z (Jun 2024)",
      who: "Erik Bernhardsson, CEO",
      whoTitle: "founder",
      reasons: [
        "You've shipped agent infrastructure that handles 2M+ tool calls/day at Ramp — Modal's looking for someone to own the function-execution layer at the same shape of problem.",
        "Erik specifically called out your policykit repo. He liked how you handled the diff semantics.",
        "You said you're not relocating from NYC. Modal's NYC office has six engineers and the infra team is half of it.",
      ],
      sent: "2 days ago",
      logoColor: "#7cffb2",
      new: true,
    },
    {
      id: 2,
      company: "Baseten",
      stage: "Series B",
      funding: "$40M, IVP (Mar 2024)",
      who: "Pankaj Gupta, founding eng",
      whoTitle: "engineer",
      reasons: [
        "They're building the eval/observability layer you described wanting to work on in your last chat with Kira.",
        "Their stack is Python + Rust; your last two roles overlap.",
        "Pankaj reviewed three of your Stripe-era talks before asking for an intro.",
      ],
      sent: "5 days ago",
      logoColor: "#d4a574",
      new: true,
    },
    {
      id: 3,
      company: "Vellum",
      stage: "Seed",
      funding: "$5M, Rebel Fund (Nov 2023)",
      who: "Akash Sharma, CEO",
      whoTitle: "founder",
      reasons: [
        "Small team (12 people), employee #15-ish range — matches the size you told Kira you wanted.",
        "They're building eval pipelines for production LLM apps. Adjacent to what you own at Ramp.",
        "Akash is in NYC two weeks a month and offered to grab coffee.",
      ],
      sent: "1 week ago",
      logoColor: "#a78bfa",
      new: false,
    },
    {
      id: 4,
      company: "Braintrust",
      stage: "Series A",
      funding: "$36M, a16z (Aug 2024)",
      who: "Ankur Goyal, CEO",
      whoTitle: "founder",
      reasons: [
        "Eval infrastructure for AI products — they're building exactly the layer you described being interested in.",
        "Their senior infra hire moved on; they're looking for someone who's owned a high-throughput tool runtime before.",
        "Remote-OK for NYC; Ankur flies through weekly.",
      ],
      sent: "1 week ago",
      logoColor: "#fb923c",
      new: false,
    },
  ],

  documents: [
    {
      name: "resume_alex_chen_2025.pdf",
      type: "resume",
      date: "Mar 12, 2025",
      size: "284 KB",
      attrs: 23,
      attrList: ["5 roles", "12 skills", "4 shipped projects", "2 leadership signals"],
    },
    {
      name: "linkedin-export.zip",
      type: "linkedin",
      date: "Mar 12, 2025",
      size: "1.2 MB",
      attrs: 14,
      attrList: ["3 recommendations parsed", "8 endorsed skills", "3 role transitions"],
    },
    {
      name: "how-i-work.md",
      type: "sop",
      date: "Mar 13, 2025",
      size: "8 KB",
      attrs: 8,
      attrList: [
        "AI collaboration style",
        "communication preferences",
        "meeting tolerance",
        "tooling",
      ],
    },
    {
      name: "ramp_tool_runtime_design.pdf",
      type: "other",
      date: "Mar 15, 2025",
      size: "1.8 MB",
      attrs: 11,
      attrList: ["systems design depth", "scaling decisions", "ownership signals"],
    },
    {
      name: "github.com/alxchen",
      type: "github",
      date: "Mar 12, 2025",
      size: "—",
      attrs: 19,
      attrList: [
        "43 repos analyzed",
        "policykit (2.1k stars)",
        "languages: Go, TS, Python",
        "commit cadence",
      ],
    },
    {
      name: "stripe-arch-talk-2023.pdf",
      type: "blog",
      date: "Mar 14, 2025",
      size: "412 KB",
      attrs: 6,
      attrList: ["public speaking", "systems thinking", "narrative ability"],
    },
  ],

  email: {
    connected: true,
    address: "alex@chen.dev",
    provider: "Gmail",
    lastSync: "4 min ago",
    threadsScanned: 1247,
    threadsRelevant: 18,
  },

  tracks: [
    {
      id: 1,
      company: "Modal",
      person: "Erik Bernhardsson",
      personRole: "CEO",
      logoColor: "#7cffb2",
      source: "intro · Kira",
      status: "needs-you",
      lastEvent: "Erik replied · 2 days ago",
      lastEventAt: "Tue, May 13",
      threadCount: 6,
      kira:
        "Erik asked three things in his last reply — your availability for an onsite, what your current comp band looks like, and whether you'd be open to a small take-home (he said he hates them too). You haven't answered the comp question. Want me to draft a reply that defers it to the first call?",
      preview: [
        {
          from: "Erik Bernhardsson",
          at: "May 13",
          text: "Alex — great chat last Thursday. Three things to nail down: (1) availability for an onsite the week of the 27th, (2) what comp band you're in right now so we're not wasting your time, (3) would you be open to a small take-home? I hate them too but the team voted.",
        },
        {
          from: "you",
          at: "May 9",
          text: "Erik — yes, Thursday 2pm works. I'll come prepared with the agentic-runtime design doc we talked about. — A",
        },
        {
          from: "Erik Bernhardsson",
          at: "May 8",
          text: "Loved the policykit walkthrough. Want to do a deeper dive Thursday? I'll bring Akshat (eng lead). 30 min.",
        },
      ],
    },
    {
      id: 2,
      company: "Baseten",
      person: "Pankaj Gupta",
      personRole: "founding eng",
      logoColor: "#d4a574",
      source: "intro · Kira",
      status: "scheduled",
      lastEvent: "Onsite scheduled · Mon May 19",
      lastEventAt: "Mon, May 19 · 11:00am",
      threadCount: 4,
      kira:
        "You have a 4-hour onsite at Baseten on Monday. Three engineers, then lunch with Tuhin. Based on the role they're hiring for and the Stripe-era talks Pankaj watched, expect deep questions on idempotency and sharding strategies. I drafted a 2-page prep doc — want to see it?",
      preview: [
        {
          from: "Pankaj Gupta",
          at: "May 12",
          text: "Confirmed for Monday. Agenda: 11am Pankaj (system design), 12pm Tuhin (lunch, ambitions), 1:30pm Amir (coding), 2:30pm Anu (values). We'll wrap by 4. Calendar invite incoming.",
        },
        {
          from: "you",
          at: "May 11",
          text: "Monday May 19 works. Happy to do onsite — easier than zoom for the system design rounds.",
        },
      ],
    },
    {
      id: 3,
      company: "Vellum",
      person: "Akash Sharma",
      personRole: "CEO",
      logoColor: "#a78bfa",
      source: "intro · Kira",
      status: "their-court",
      lastEvent: "You sent thank-you · 6 days ago",
      lastEventAt: "Wed, May 7",
      threadCount: 5,
      kira:
        "You had coffee with Akash a week ago. Your thank-you note has been sitting since Wednesday. Akash's pattern is to respond within 4 days based on his other threads in your inbox. I'll watch — if nothing by Friday I'll suggest a soft follow-up.",
      preview: [
        {
          from: "you",
          at: "May 7",
          text: "Akash — thanks for grabbing coffee yesterday. Loved the eval-pipeline demo. Let me know what's next on your end. — A",
        },
        {
          from: "Akash Sharma",
          at: "May 5",
          text: "Tomorrow 8am at Devoción in Williamsburg works. See you there.",
        },
      ],
    },
    {
      id: 4,
      company: "Braintrust",
      person: "Ankur Goyal",
      personRole: "CEO",
      logoColor: "#fb923c",
      source: "intro · Kira",
      status: "stale",
      lastEvent: "Intro sent · 9 days ago",
      lastEventAt: "Sun, May 4",
      threadCount: 1,
      kira:
        'Braintrust intro has been sitting for 9 days. You said "let\'s talk" on the card but never replied to Ankur\'s email. He sent a single line: "when works?" Want me to send a soft nudge with two time slots from your calendar?',
      preview: [
        {
          from: "Ankur Goyal",
          at: "May 4",
          text: "Alex — Kira connected us. Saw your tool-runtime work at Ramp. Would love to chat. When works?",
        },
      ],
    },
  ],

  discoveries: [
    {
      id: 101,
      company: "Anthropic",
      person: "Sarah Park",
      personRole: "recruiter",
      logoColor: "#d4d4d4",
      arrived: "3 days ago",
      kiraVerdict: "match",
      kira:
        "Sarah from Anthropic reached out cold on Friday about a role on their agent-infrastructure team. I checked the JD against your criteria — Series F so it's bigger than your #15-60 band, but the team is 8 people and matches the eval/agent shape you've told me you want. Worth replying. Want me to draft?",
      snippet:
        "Hi Alex — I lead recruiting for our applied research team. We're standing up a small (8 people) sub-team focused on agent infrastructure and your name came up from Erik at Modal of all places. Open to a 20-minute chat next week?",
    },
    {
      id: 102,
      company: "Pylon (YC W24)",
      person: "Marty Kausas",
      personRole: "co-founder, college friend",
      logoColor: "#6ee7b7",
      arrived: "1 week ago",
      kiraVerdict: "off-criteria",
      kira:
        "Your friend Marty from CMU is hiring eng #3 at Pylon. He specifically asked about you. This doesn't match what you told me — too early, support-tool surface, not AI-infra. I held off responding. But you might want to reply as a friend regardless. Want me to draft a warm decline?",
      snippet:
        "Alex!! Long time. We just closed our A and I'm trying to convince three people. You're on the list. Don't say no until we talk. Drinks this week?",
    },
    {
      id: 103,
      company: "Foundry (Sequoia)",
      person: "Talia Bhatt",
      personRole: "talent partner",
      logoColor: "#fde68a",
      arrived: "2 weeks ago",
      kiraVerdict: "noise",
      kira:
        "Generic recruiter outreach. Talia uses the same opening line on 4 other engineers in my training set, none of whom matched her roles. I'd skip it — but flagging so you can verify my judgment.",
      snippet:
        "Hi Alex! I work with founders at Sequoia portfolio companies on key engineering hires. I have a few roles that might be a fit based on your background…",
    },
  ],

  chats: [
    {
      id: 1,
      title: "What you're actually optimizing for",
      date: "Apr 02, 2025",
      duration: "11 min",
      summary:
        "Drilled into the difference between staying in infra versus moving closer to product. You said you'd take a 30% comp cut for the right founders.",
      transcript: [
        {
          from: "kira",
          text: "Last time we talked you said you wanted to be employee #15 to 60. Walk me through why that band specifically.",
        },
        {
          from: "user",
          text: "Below 15 and the founders are still figuring out what they're building. I don't want to be a co-founder. Above 60 the product is locked and I'd just be executing.",
        },
        {
          from: "kira",
          text: "That tracks. And the AI-first part — is that about the technology, or the kind of people it attracts right now?",
        },
        { from: "user", text: "Honestly the people. AI is the only place I see infra problems that feel new." },
        { from: "kira", text: "Okay. One more — comp. You haven't put a number on it. Is that on purpose?" },
        {
          from: "user",
          text: "I'd take a 30% cut for the right founders. I wouldn't take a 5% cut for the wrong ones.",
        },
        { from: "kira", text: "Got it. I'll calibrate intros against that — founders first, comp second." },
      ],
    },
    {
      id: 2,
      title: "How you actually work with Claude",
      date: "Mar 22, 2025",
      duration: "7 min",
      summary:
        "Talked through your AI collaboration style. You write load-bearing code by hand; Claude handles plumbing and PR review.",
      transcript: [
        {
          from: "kira",
          text: "Your SOP says you treat Claude Code like a real collaborator. What does that actually look like day to day?",
        },
        {
          from: "user",
          text: "I pair with it on plumbing. Tests, migrations, that kind of thing. I review its diffs the way I'd review a junior engineer's.",
        },
        { from: "kira", text: "What do you not let it write?" },
        {
          from: "user",
          text: "Anything that touches money or auth. And anything that's the core of what I'm trying to think through — if I let Claude write it, I won't understand it well enough to defend it later.",
        },
      ],
    },
    {
      id: 3,
      title: "Career arc, in your own words",
      date: "Mar 14, 2025",
      duration: "14 min",
      summary:
        "Your first conversation with Kira. Walked through CMU → Stripe → Ramp and the why behind each move.",
      transcript: [
        {
          from: "kira",
          text: "Your resume tells me what you did. I want to know why you did it. Start with leaving Stripe — that's the most interesting move on your timeline.",
        },
        {
          from: "user",
          text: "I was on Payments Foundations. Important work but I was three layers from anyone using the product. I wanted to feel a release go out and have it matter to a person, not a metric.",
        },
        { from: "kira", text: "And Ramp specifically?" },
        {
          from: "user",
          text: "I knew two people there I respected. The agentic stuff hadn't started yet but I could tell they were going to take AI seriously, not as a marketing layer.",
        },
      ],
    },
  ],
};
