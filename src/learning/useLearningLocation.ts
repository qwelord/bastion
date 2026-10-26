import { useEffect, useState } from 'react';
import { learningLocation } from './navigation';
export function useLearningLocation() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const refresh = () => setHash(location.hash);
    window.addEventListener('hashchange', refresh);
    return () => window.removeEventListener('hashchange', refresh);
  }, []);
  return learningLocation(hash);
}
