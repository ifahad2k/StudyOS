import React from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="canvas">
          <Dashboard />
        </div>
      </div>
    </div>
  );
}

export default App;
