import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page not-found">
      <span className="mono-label">Error 404</span>
      <h1 className="not-found__title">
        Nothing here<span className="accent">.</span>
      </h1>
      <p className="not-found__body">
        The page you asked for does not exist — which, on a site this size,
        probably means a stale link rather than anything interesting.
      </p>
      <Link href="/" className="button button--ghost">
        Back to the studio
      </Link>
    </div>
  );
}
