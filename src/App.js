import Reportes from './pages/Reportes';
import './App.css';

function App() {
  return (
    <div>
      <nav className="app-nav-bar">
        <span className="app-nav-brand">🐟 Pedidos Marinos</span>
        <span className="app-nav-current">Reportes</span>
      </nav>
      <Reportes />
    </div>
  );
}

export default App;
