import Link from "next/link";

export default function LoginPrompt({ next, children = "Log in with your ticket to play." }) {
  return (
    <div className="panel-inner empty">
      <p className="big-emoji" aria-hidden="true">🔑</p>
      <p>{children}</p>
      <Link className="btn primary" href={`/my-ticket?next=${encodeURIComponent(next)}`}>
        Log in on My Ticket
      </Link>
    </div>
  );
}
