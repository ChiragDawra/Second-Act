import { ArrowLeft } from 'lucide-react';
import { LinkButton, Mark } from '../ui/kit';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-6 text-center grain relative overflow-hidden">
      <div className="absolute inset-0 spotlight" />
      <div className="relative">
        <Mark size={40} className="mx-auto" />
        <p className="eyebrow mt-8">Error 404 · intermission</p>
        <h1 className="headline text-5xl sm:text-6xl mt-4">
          This scene <em>isn&rsquo;t written</em> yet.
        </h1>
        <p className="text-fg-muted mt-4">The page you are looking for does not exist.</p>
        <div className="mt-8 flex justify-center">
          <LinkButton to="/" kind="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Second Act
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
