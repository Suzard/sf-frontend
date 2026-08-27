"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** Circular profile photo with a stable, tinted initials fallback. */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<
    Contact,
    "first_name" | "last_name" | "email" | "photo_url"
  >;
  size?: keyof typeof SIZES;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-display font-semibold ${SIZES[size]}`}
    >
      {initials(contact)}
      {contact.photo_url && failedUrl !== contact.photo_url ? (
        // Contact photos can use any user-provided HTTP(S) host, so they cannot
        // use next/image's build-time remote host allow-list.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={contact.photo_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedUrl(contact.photo_url)}
        />
      ) : null}
    </span>
  );
}
