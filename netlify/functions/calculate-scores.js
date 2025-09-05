const Airtable = require('airtable');
exports.handler = async function (event) {
  try {
    const { week } = JSON.parse(event.body);
    const { AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID } = process.env;
    const base = new Airtable({ apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(AIRTABLE_BASE_ID);

    // 1. Fetch all necessary data from Airtable
    const [schedule, picks, players] = await Promise.all([
        base('Schedule').select({ filterByFormula: `{Week} = ${week}` }).all(),
        base('Picks').select({ filterByFormula: `{Week} = ${week}` }).all(),
        base('Players').select({ fields: ["Name"] }).all()
    ]);

    // Create a map of Winning Teams for easy lookup: "Away-Home" -> "Winner"
    const winnersMap = schedule.reduce((acc, record) => {
        const identifier = `${record.get('Away Team')}-${record.get('Home Team')}`;
        acc[identifier] = record.get('Winning Team');
        return acc;
    }, {});
    
    // Create a map of Player Names to their Record IDs
    const playerNameToIdMap = players.reduce((acc, record) => {
        acc[record.get('Name')] = record.id;
        return acc;
    }, {});

    // 2. Calculate scores for each player
    const playerScores = picks.reduce((acc, pick) => {
        const playerName = pick.get('Player');
        if (!acc[playerName]) acc[playerName] = 0;
        
        const pickedTeam = pick.get('Pick');
        const matchIdentifier = `${pick.get('Away Team')}-${pick.get('Home Team')}`;
        const winningTeam = winnersMap[matchIdentifier];

        if (pickedTeam === winningTeam) {
            acc[playerName] += pick.get('Value');
        }
        return acc;
    }, {});

    // 3. Find existing score records for this week to update them, or prepare new ones
    const existingScores = await base('Scores').select({ filterByFormula: `{Week} = ${week}` }).all();
    const recordsToUpdate = [];
    const recordsToCreate = [];

    for (const playerName in playerScores) {
        const playerRecordId = playerNameToIdMap[playerName];
        // If a player exists in picks but not in the player table, skip them
        if (!playerRecordId) continue;

        const score = playerScores[playerName];
        const existingRecord = existingScores.find(r => r.get('Player') && r.get('Player')[0] === playerRecordId);

        if (existingRecord) {
            // If the score is different, prepare an update
            if (existingRecord.get('Score') !== score) {
                recordsToUpdate.push({ id: existingRecord.id, fields: { Score: score } });
            }
        } else {
            // If no record exists, prepare to create one
            recordsToCreate.push({ fields: { Player: [playerRecordId], Week: parseInt(week, 10), Score: score } });
        }
    }

    // 4. Update and Create scores in the Scores table in batches of 10
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

    return { statusCode: 200, body: JSON.stringify({ message: `Scores for Week ${week} calculated successfully.` }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};