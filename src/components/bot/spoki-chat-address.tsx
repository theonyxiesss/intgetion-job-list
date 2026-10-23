"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { chatTargetFromParams } from "./spoki-dock-model";
import { useSpoki } from "./spoki-context";

/**
 * On `/chat` with the panel on (D525): hands the thread named in the address
 * (`?job=`, `?from=`, `?campaign=`…) to the one Spoki. A bare `/chat` names
 * none, so the thread already open stays.
 */
export function SpokiChatAddress() {
  const spoki = useSpoki();
  const params = useSearchParams();
  const query = params.toString();
  const follow = spoki?.follow;

  useEffect(() => {
    const target = chatTargetFromParams(new URLSearchParams(query));
    if (target && follow) follow(target);
  }, [query, follow]);

  return null;
}
