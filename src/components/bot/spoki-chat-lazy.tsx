"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { PageSection } from "@/config/page-sections";
import { FetchedMessages } from "@/components/shell/fetched-messages";
import type { FreelanceCardCopy } from "./freelance-copy";
import type { ChatTarget } from "./spoki-dock-model";

/** Warms the chat code, for a hover or a focus on a way into Spoki. */
export function preloadSpokiChat() {
  void import("./chat");
}

// The chat and its messages load when the panel first opens (D476, D525).
const Chat = dynamic(() => import("./chat").then((module) => module.Chat), {
  ssr: false,
  loading: () => null,
});

/**
 * The chat inside the Spoki panel, with the message namespaces it reads.
 * The only place that loads `chat.tsx` lazily: `client-namespaces.test.ts`
 * takes the list below as what this part of the layout provides.
 */
export function SpokiChat({
  chatKey,
  target,
  section,
  signedIn,
  fallback,
}: {
  chatKey: string;
  target: ChatTarget | null;
  section: PageSection;
  signedIn: boolean;
  fallback: ReactNode;
}) {
  return (
    <FetchedMessages
      namespaces={[
        "chat",
        "explain",
        "ugc",
        "notifications",
        "notificationSettings",
        "jobs",
        "chatFreelance",
      ]}
      fallback={fallback}
    >
      {(messages) => (
        <Chat
          key={chatKey}
          variant="panel"
          section={section}
          signedIn={signedIn}
          jobId={target?.job}
          campaignId={target?.campaign}
          inviteId={target?.invite}
          serviceId={target?.service}
          orderId={target?.order}
          confirmId={target?.confirm}
          fromServices={target?.from === "services"}
          fromCampaigns={target?.from === "campaigns"}
          fromFreelanceSell={target?.from === "freelance_sell"}
          fromPostJob={target?.from === "post_job"}
          freelanceCopy={(messages.chatFreelance ?? {}) as FreelanceCardCopy}
        />
      )}
    </FetchedMessages>
  );
}
