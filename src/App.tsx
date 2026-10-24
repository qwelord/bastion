import { Shell } from './components/Shell';
import { useRoute, useSettings } from './state';
import { Play } from './pages/Play';
export default function App() { const route = useRoute(); const [settings] = useSettings(); return <Shell route={route}><Play settings={settings}/></Shell>; }
