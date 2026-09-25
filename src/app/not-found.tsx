import { Sheet } from '@/components/Sheet';
import { TransitionLink } from '@/components/Transition';

export default function NotFound() {
  return (
    <Sheet
      kicker="Error 404"
      title="This page was torn out."
      lead={<p>Probably a stale link. The rest of the book is still here.</p>}
    >
      <div className="sheet__actions">
        <TransitionLink href="/" className="sheet__primary">
          Back to the start
        </TransitionLink>
      </div>
    </Sheet>
  );
}
