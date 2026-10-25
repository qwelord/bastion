import { Shell } from './components/Shell';
import { lazy, Suspense } from 'react';
import { useRoute, useSettings } from './state';
import { Play } from './pages/Play';
import { Analysis } from './pages/Analysis';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
const Learn = lazy(() => import('./pages/Learn').then((module) => ({ default: module.Learn })));
const Lesson = lazy(() => import('./pages/Lesson').then((module) => ({ default: module.Lesson })));
export default function App() {
  const route = useRoute();
  const [settings, setSettings] = useSettings();
  return (
    <Shell route={route}>
      {route === 'play' ? (
        <Play settings={settings} />
      ) : route === 'learn' ? (
        <Suspense fallback={<LearningLoading />}>
          <Learn settings={settings} />
        </Suspense>
      ) : route === 'lesson' ? (
        <Suspense fallback={<LearningLoading />}>
          <Lesson settings={settings} />
        </Suspense>
      ) : route === 'analysis' ? (
        <Analysis settings={settings} />
      ) : route === 'library' ? (
        <Library />
      ) : (
        <Settings settings={settings} setSettings={setSettings} />
      )}
    </Shell>
  );
}
function LearningLoading() {
  return (
    <div className="learning-loading" role="status">
      <span className="engine-spinner" aria-hidden="true" />
      Открываем учебную доску…
    </div>
  );
}
