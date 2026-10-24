import { Shell } from './components/Shell';
import { useRoute, useSettings } from './state';
export default function App() { const route = useRoute(); useSettings(); return <Shell route={route}><div className="page-intro"><h1>Время для шахмат.</h1><p>Ваша следующая партия начинается здесь.</p></div></Shell>; }
