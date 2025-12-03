import React from 'react';
import './App.css';
import { useState } from 'react';
import { TeamsGrid, type Team } from './components/TeamsGrid';
import { TeamDetail } from './components/TeamDetail';

function App() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  if (selectedTeam) {
    return (
      <TeamDetail
      teamId={selectedTeam.id}
      onBack={() => setSelectedTeam(null)}
      canEditRoster={false}   // league owners: read-only
    />
    
    );
  }

  return (
    <div className="app-root">
      <TeamsGrid onTeamClick={(team) => setSelectedTeam(team)} />
    </div>
  );
}

export default App;
