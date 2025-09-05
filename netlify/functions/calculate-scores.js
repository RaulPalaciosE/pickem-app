const Airtable = require('airtable');
exports.handler = async function (event) {
  try {
    const { week, winners } = JSON.parse(event.body);
    const { AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID } = process.env;
    const base = new Airtable({ apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(AIRTABLE_BASE_ID);

    const [picks, players, scheduleForWeek] = await Promise.all([
        base('Picks').select({ filterByFormula: `{Week} = ${week}` }).all(),
        base('Players').select({ fields: ["Name"] }).all(),
        base('Schedule').select({ filterByFormula: `{Week} = ${week}` }).all()
    ]);

    const playerNameToIdMap = players.reduce((acc, record) => {
        acc[record.get('Name')] = record.id;
        return acc;
    }, {});
    
    const matchIdToValueMap = scheduleForWeek.reduce((acc, record) => {
        const identifier = `${record.get('Away Team')}-${record.get('Home Team')}`;
        acc[identifier] = record.get('Value');
        return acc;
    }, {});

    const playerScores = picks.reduce((acc, pick) => {
        const playerName = pick.get('Player');
        if (!acc[playerName]) acc[playerName] = 0;
        
        const pickedTeam = pick.get('Pick');
        const matchIdentifier = `${pick.get('Away Team')}-${pick.get('Home Team')}`;
        const winningTeam = winners[matchIdentifier];
        const matchValue = matchIdToValueMap[matchIdentifier] || 0;

        if (pickedTeam === winningTeam) {
            acc[playerName] += matchValue;
        }
        return acc;
    }, {});

    const existingScores = await base('Scores').select({ filterByFormula: `{Week} = ${week}` }).all();
    const recordsToUpdate = [];
    const recordsToCreate = [];

    for (const playerName in playerScores) {
        const playerRecordId = playerNameToIdMap[playerName];
        if (!playerRecordId) continue;

        const score = playerScores[playerName];
        const existingRecord = existingScores.find(r => r.get('Player') && r.get('Player')[0] === playerRecordId);

        if (existingRecord) {
            recordsToUpdate.push({ id: existingRecord.id, fields: { Score: score } });
        } else {
            recordsToCreate.push({ fields: { Player: [playerRecordId], Week: parseInt(week, 10), Score: score } });
        }
    }
    
    const chunkSize = 10;
    if (recordsToUpdate.length > 0) {
        for (let i = 0; i < recordsToUpdate.length; i += chunkSize) {
            await base('Scores').update(recordsToUpdate.slice(i, i + chunkSize));
        }
    }
    if (recordsToCreate.length > 0) {
        for (let i = 0; i < recordsToCreate.length; i += chunkSize) {
            await base('Scores').create(recordsToCreate.slice(i, i + chunkSize));
        }
    }

    return { statusCode: 200, body: JSON.stringify({ message: `Scores for Week ${week} calculated.` }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};