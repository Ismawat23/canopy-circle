import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} className="bg-mesh">
      <Sidebar />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
