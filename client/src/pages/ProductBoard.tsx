import React, { useState } from "react";
import { MessageCircle, Megaphone, ShoppingBag, Users } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";

/* ── Channel config ──────────────────────────────────────────── */

type ChannelId = "announcements" | "marketplace" | "general";

const CHANNELS: {
  id: ChannelId;
  label: string;
  icon: React.ElementType;
  accent: string;
  accentBg: string;
  description: string;
}[] = [
  {
    id: "announcements",
    label: "Announcements",
    icon: Megaphone,
    accent: "text-amber-500",
    accentBg: "bg-amber-500/10",
    description: "Platform updates and news (admin only)",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: ShoppingBag,
    accent: "text-emerald-500",
    accentBg: "bg-emerald-500/10",
    description: "League listings and free agent postings",
  },
  {
    id: "general",
    label: "General",
    icon: MessageCircle,
    accent: "text-purple-500",
    accentBg: "bg-purple-500/10",
    description: "Open discussion for the TFL community",
  },
];

/* ── Sample cards ────────────────────────────────────────────── */

const SAMPLE_CARDS = [
  {
    channel: "announcements" as ChannelId,
    title: "Welcome to TFL Community",
    body: "The community board is launching soon. Stay tuned for league listings, free agent postings, and open discussion.",
    type: "announcement",
  },
  {
    channel: "marketplace" as ChannelId,
    title: "OGBA 2026 - NL-Only Roto (12 teams)",
    body: "Established NL-only rotisserie league entering its 30th season. $400 auction budget, keeper format. Looking for experienced fantasy baseball managers.",
    type: "league_listing",
    metadata: { sport: "Baseball", format: "Roto / Auction / Keepers", buyIn: "$100", spotsOpen: 0 },
  },
];

/* ── Component ───────────────────────────────────────────────── */

export default function ProductBoard() {
  const [activeChannel, setActiveChannel] = useState<ChannelId>("marketplace");

  const channelCards = SAMPLE_CARDS.filter((c) => c.channel === activeChannel);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-10">
      <div className="flex items-center gap-3 mb-6">
        <PageHeader
          title="Community"
          subtitle="Connect with fantasy sports managers across TFL"
        />
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 self-start mt-1">
          Coming Soon
        </span>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const isActive = activeChannel === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap
                transition-colors border
                ${isActive
                  ? `${ch.accentBg} border-current ${ch.accent}`
                  : "bg-[var(--lg-tint)] border-transparent text-[var(--lg-text-muted)] hover:bg-[var(--lg-tint-hover)]"
                }`}
            >
              <Icon className="w-4 h-4" />
              {ch.label}
            </button>
          );
        })}
      </div>

      {/* Channel description */}
      {(() => {
        const ch = CHANNELS.find((c) => c.id === activeChannel);
        return ch ? (
          <p className="text-xs text-[var(--lg-text-muted)] mb-4">{ch.description}</p>
        ) : null;
      })()}

      {/* Cards */}
      <div className="space-y-4">
        {channelCards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 border border-[var(--lg-border-faint)] bg-[var(--lg-glass-bg)]"
          >
            <div className="flex items-center gap-2 mb-2">
              {card.type === "league_listing" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  League Listing
                </span>
              )}
              {card.type === "announcement" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Announcement
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-[var(--lg-text-primary)] mb-1">
              {card.title}
            </h3>
            <p className="text-xs text-[var(--lg-text-secondary)] leading-relaxed mb-3">
              {card.body}
            </p>

            {card.metadata && (
              <div className="flex flex-wrap gap-3 text-[10px] text-[var(--lg-text-muted)]">
                {card.metadata.sport && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {card.metadata.sport}
                  </span>
                )}
                {card.metadata.format && (
                  <span>{card.metadata.format}</span>
                )}
                {card.metadata.buyIn && (
                  <span className="font-medium">Buy-in: {card.metadata.buyIn}</span>
                )}
                {card.metadata.spotsOpen !== undefined && (
                  <span className={card.metadata.spotsOpen > 0 ? "text-emerald-500 font-semibold" : "text-[var(--lg-text-muted)]"}>
                    {card.metadata.spotsOpen > 0 ? `${card.metadata.spotsOpen} spots open` : "Full"}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {channelCards.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">
              {activeChannel === "announcements" ? "📢" : activeChannel === "marketplace" ? "🏪" : "💬"}
            </div>
            <p className="text-sm text-[var(--lg-text-muted)]">
              No posts in this channel yet.
            </p>
            <p className="text-xs text-[var(--lg-text-muted)] mt-1 opacity-60">
              This feature is coming soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
