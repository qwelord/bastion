import { Shell } from './components/Shell';
import { useRoute, useSettings } from './state';
import { Play } from './pages/Play';
import { Learn } from './pages/Learn';
import { Lesson } from './pages/Lesson';
import { Analysis } from './pages/Analysis';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
export default function App() {
  const route = useRoute();
  const [settings, setSettings] = useSettings();
  return (
    <Shell route={route}>
      {route === 'play' ? (
        <Play settings={settings} />
      ) : route === 'learn' ? (
        <Learn settings={settings} />
      ) : route === 'lesson' ? (
        <Lesson settings={settings} />
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
