import { Outlet } from 'react-router-dom';
import LayoutComponent from './components/layoutComponent';
export default function Home() {
  return (
    <div>
      <h1>EzMonitor</h1>
      <LayoutComponent />
    </div>
  );
}
