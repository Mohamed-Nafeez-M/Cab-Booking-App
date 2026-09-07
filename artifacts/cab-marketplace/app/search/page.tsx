import { Suspense } from 'react';
import { SearchPage } from '@/components/app-shared';

export default function Page() {
  // SearchPage reads the initial query via useSearchParams(), which requires
  // a Suspense boundary during prerendering.
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}
