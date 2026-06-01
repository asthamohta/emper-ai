import * as React from "react";

export type IconName =
  | "user"
  | "spark"
  | "inbox"
  | "doc"
  | "chat"
  | "lock"
  | "eye"
  | "plus"
  | "arrow-right"
  | "check"
  | "x"
  | "mic"
  | "upload"
  | "github"
  | "link"
  | "dot"
  | "settings"
  | "chevron-down"
  | "chevron-right"
  | "command"
  | "send"
  | "more"
  | "external"
  | "play"
  | "back"
  | "track"
  | "mail"
  | "logout";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 14, className = "" }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M3 13l3-9h12l3 9" />
          <path d="M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6" />
          <path d="M3 13h5l1 2h6l1-2h5" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 11-3-6.2L21 4l-1 4.5A8 8 0 0121 12z" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M4 12l5 5L20 6" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "mic":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0014 0M12 18v3" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 4v12M6 10l6-6 6 6" />
          <path d="M4 20h16" />
        </svg>
      );
    case "github":
      return (
        <svg {...common}>
          <path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.9a3.4 3.4 0 00-1-2.7c3.3-.4 6.7-1.6 6.7-7.4 0-1.5-.6-2.9-1.5-4 .4-1.4.4-2.8-.1-4.1 0 0-1.2-.4-4.1 1.5a14 14 0 00-7.2 0C4.9-.4 3.7 0 3.7 0c-.5 1.3-.5 2.7-.1 4.1A5.7 5.7 0 002 8c0 5.8 3.4 7 6.7 7.4a3.4 3.4 0 00-.9 2.6V22" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
          <path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
        </svg>
      );
    case "dot":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2.1-1.2L14 3h-4l-.4 2.5a7 7 0 00-2.1 1.2L5 5.8 3 9.2l2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 002.1 1.2L10 21h4l.4-2.5a7 7 0 002.1-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "command":
      return (
        <svg {...common}>
          <path d="M15 6a3 3 0 113 3h-3V6zM9 6a3 3 0 10-3 3h3V6zM9 18a3 3 0 11-3-3h3v3zM15 18a3 3 0 103-3h-3v3zM9 9h6v6H9z" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="19" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case "external":
      return (
        <svg {...common}>
          <path d="M14 4h6v6M10 14L20 4M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      );
    case "track":
      return (
        <svg {...common}>
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      );
    default:
      return null;
  }
}
