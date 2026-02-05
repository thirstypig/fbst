
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:4000';
const TEAM_CODE = 'TEST_TEAM';
const YEAR = 2026;

async function runTests() {
  console.log('Starting Roster Management Integration Tests...');

  // 1. Test POST /api/roster/add-player
  console.log('\nTesting POST /api/roster/add-player...');
  const newPlayer = {
    year: YEAR,
    teamCode: TEAM_CODE,
    playerName: 'Test Player 1',
    position: 'OF',
    mlbTeam: 'LAD',
    acquisitionCost: 10
  };

  try {
    const res = await fetch(`${API_URL}/api/roster/add-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlayer)
    });
    
    if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
    const data = await res.json();
    console.log('✅ Player added:', data);
    
    if (data.playerName !== newPlayer.playerName) throw new Error('Player name mismatch');
    
    // 2. Test GET /api/roster/:teamCode
    console.log(`\nTesting GET /api/roster/${TEAM_CODE}?year=${YEAR}...`);
    const getRes = await fetch(`${API_URL}/api/roster/${TEAM_CODE}?year=${YEAR}`);
    if (!getRes.ok) throw new Error(`Status ${getRes.status}: ${await getRes.text()}`);
    const roster = await getRes.json();
    console.log(`✅ Roster fetched (${roster.length} players)`);
    
    const addedPlayer = roster.find((p: any) => p.playerName === newPlayer.playerName);
    if (!addedPlayer) throw new Error('Added player not found in roster');
    
    // 3. Test DELETE /api/roster/:id
    console.log(`\nTesting DELETE /api/roster/${addedPlayer.id}...`);
    const delRes = await fetch(`${API_URL}/api/roster/${addedPlayer.id}`, { method: 'DELETE' });
    if (!delRes.ok) throw new Error(`Status ${delRes.status}: ${await delRes.text()}`);
    console.log('✅ Player deleted');
    
    // Verify deletion
    const verifyRes = await fetch(`${API_URL}/api/roster/${TEAM_CODE}?year=${YEAR}`);
    const verifyRoster = await verifyRes.json();
    if (verifyRoster.find((p: any) => p.id === addedPlayer.id)) throw new Error('Player still exists after delete');
    console.log('✅ Deletion verified');

    // 4. Test Template Download
    console.log('\nTesting GET /api/roster/import/template...');
    const templateRes = await fetch(`${API_URL}/api/roster/import/template`);
    if (!templateRes.ok) throw new Error(`Status ${templateRes.status}`);
    const templateText = await templateRes.text();
    if (!templateText.includes('teamCode,playerName')) throw new Error('Invalid template content');
    console.log('✅ Template downloaded successfully');

    // 5. Test CSV Upload (Manual Boundary Construction)
    console.log('\nTesting POST /api/roster/import (CSV Upload)...');
    const csvContent = `teamCode,playerName,position,mlbTeam,acquisitionCost\n${TEAM_CODE},Imported Player,P,NYY,5`;
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="year"',
      '',
      String(YEAR),
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.csv"',
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}--`
    ].join('\r\n');

    const uploadRes = await fetch(`${API_URL}/api/roster/import`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });

    if (!uploadRes.ok) throw new Error(`Status ${uploadRes.status}: ${await uploadRes.text()}`);
    const uploadData = await uploadRes.json();
    console.log('✅ CSV Import response:', uploadData);
    
    if (uploadData.created !== 1) throw new Error('Expected 1 created record');
    
    // Cleanup imported player
    const finalRosterRes = await fetch(`${API_URL}/api/roster/${TEAM_CODE}?year=${YEAR}`);
    const finalRoster = await finalRosterRes.json();
    const importedPlayer = finalRoster.find((p: any) => p.playerName === 'Imported Player');
    if (importedPlayer) {
      await fetch(`${API_URL}/api/roster/${importedPlayer.id}`, { method: 'DELETE' });
      console.log('✅ Cleanup: Imported player deleted');
    }

    console.log('\n🎉 ALL TESTS PASSED!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runTests();
