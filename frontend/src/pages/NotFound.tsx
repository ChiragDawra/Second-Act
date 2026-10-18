import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface-subtle px-6 text-center">
      <p className="font-mono text-xs text-sap-600">404</p>
      <h1 className="text-2xl font-extrabold text-ink-950">This page does not exist</h1>
      <Link to="/" className="text-sm font-semibold text-sap-600 hover:underline">
        Back to Second Act
      </Link>
    </div>
  );
}
