"use client";

import { useState } from "react";
import { BotAlertsSwitch } from "./bot-alerts-switch";
import { Switch } from "@/components/ui/choice";

type ChannelLabels = {
  title: string;
  text: string;
  link: string;
  saved: string;
  error: string;
};

/**
 * The agent flag plus the two new-job switches (D349). Turning the agent
 * off greys both switches; they keep using the shared preference writer.
 */
export function AgentBriefsControls({
  hasProfile,
  agentEnabled,
  telegram,
  email,
  labels,
}: {
  hasProfile: boolean;
  agentEnabled: boolean;
  telegram: { linked: boolean; enabled: boolean };
  email: { linked: boolean; enabled: boolean };
  labels: {
    agentTitle: string;
    agentText: string;
    agentSaved: string;
    agentError: string;
    agentOff: string;
    telegram: ChannelLabels;
    email: ChannelLabels;
  };
}) {
  const [agentOn, setAgentOn] = useState(agentEnabled);
  const [agentMessage, setAgentMessage] = useState("");
  const locked = hasProfile && !agentOn;

  async function toggleAgent(next: boolean) {
    setAgentOn(next);
    setAgentMessage("");
    const response = await fetch("/api/notifications/agent-briefs", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (!response.ok) setAgentOn(!next);
    setAgentMessage(response.ok ? labels.agentSaved : labels.agentError);
  }

  return (
    <div className="flex flex-col gap-4">
      {hasProfile ? (
        <section className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
          <div className="flex flex-col gap-1">
            <p className="t-h3">{labels.agentTitle}</p>
            <p className="text-fg-muted">{labels.agentText}</p>
            {agentMessage ? (
              <p role="status" className="text-fg-muted">
                {agentMessage}
              </p>
            ) : null}
          </div>
          <Switch
            label={labels.agentTitle}
            checked={agentOn}
            onChange={(event) => toggleAgent(event.target.checked)}
          />
        </section>
      ) : null}
      {locked ? <p className="text-fg-muted">{labels.agentOff}</p> : null}
      <BotAlertsSwitch
        channel="telegram"
        linked={telegram.linked}
        enabled={telegram.enabled}
        locked={locked}
        labels={labels.telegram}
      />
      <BotAlertsSwitch
        channel="email"
        linked={email.linked}
        enabled={email.enabled}
        locked={locked}
        labels={labels.email}
      />
    </div>
  );
}
