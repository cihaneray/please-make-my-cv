import React from "react";
import { Profile } from "@/lib/types";
import { normalizeUrl, cleanDisplayUrl } from "../utils/contact-helpers";

interface ContactLineProps {
  profile: Profile;
  separator?: string;
  className?: string;
  itemClassName?: string;
  linkClassName?: string;
}

export function ContactLine({
  profile,
  separator = "•",
  className = "",
  itemClassName = "",
  linkClassName = "hover:underline",
}: ContactLineProps) {
  const items: React.ReactNode[] = [];

  if (profile.email) {
    items.push(
      <a
        key="email"
        href={`mailto:${profile.email}`}
        className={linkClassName}
        title="Email"
      >
        {profile.email}
      </a>,
    );
  }

  if (profile.phone) {
    items.push(
      <a
        key="phone"
        href={`tel:${profile.phone}`}
        className={linkClassName}
        title="Phone"
      >
        {profile.phone}
      </a>,
    );
  }

  if (profile.location) {
    items.push(<span key="location">{profile.location}</span>);
  }

  if (profile.website) {
    const url = normalizeUrl(profile.website);
    items.push(
      <a
        key="website"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        title="Portfolio / Website"
      >
        {cleanDisplayUrl(profile.website)}
      </a>,
    );
  }

  if (profile.linkedin) {
    const url = normalizeUrl(profile.linkedin);
    items.push(
      <a
        key="linkedin"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        title="LinkedIn Profile"
      >
        {cleanDisplayUrl(profile.linkedin)}
      </a>,
    );
  }

  if (profile.github) {
    const url = normalizeUrl(profile.github);
    items.push(
      <a
        key="github"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        title="GitHub Profile"
      >
        {cleanDisplayUrl(profile.github)}
      </a>,
    );
  }

  if (profile.links && profile.links.length > 0) {
    profile.links.forEach((l) => {
      if (l.url) {
        items.push(
          <a
            key={l.id || l.url}
            href={normalizeUrl(l.url)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            title={l.label || cleanDisplayUrl(l.url)}
          >
            {l.label || cleanDisplayUrl(l.url)}
          </a>,
        );
      }
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {items.map((node, idx) => (
        <React.Fragment key={idx}>
          <span className={`inline-flex items-center ${itemClassName}`}>
            {node}
          </span>
          {idx < items.length - 1 && (
            <span className="opacity-40 select-none text-[0.8em]">
              {separator}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
