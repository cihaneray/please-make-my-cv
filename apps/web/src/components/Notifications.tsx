"use client";
import { useCopy } from "@/lib/copy";
import React, { useEffect, useState } from "react";
export function notify(message: string) {
  window.dispatchEvent(new CustomEvent("cv-notice", { detail: message }));
}
export function Notifications() {
  const copy = useCopy();

  const [message, setMessage] = useState("");
  useEffect(() => {
    const listener = (event: Event) =>
      setMessage((event as CustomEvent<string>).detail);
    window.addEventListener("cv-notice", listener);
    return () => window.removeEventListener("cv-notice", listener);
  }, []);
  return message ? (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[100] max-w-md bg-white border shadow-lg rounded p-4"
    >
      <p>{message}</p>
      {/failed|could not|unavailable/i.test(message) && (
        <button onClick={() => window.location.reload()}>
          {" "}
          {copy("Reload to retry")}{" "}
        </button>
      )}
      <button onClick={() => setMessage("")}> {copy("Dismiss")} </button>
    </div>
  ) : null;
}
