const Airtable = require('airtable');
exports.handler = async function (event) {
  try {
    const data = JSON.parse(event.body);
    const { AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID } = process.env;
    const base = new Airtable({ apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(AIRTABLE_BASE_ID);

    const existingPicks = await base('Picks').select({
      filterByFormula: `AND({Player} = '${data.playerName}', {Week} = ${data.picks[0].week})`,
      maxRecords: 1
    }).firstPage();

    if (existingPicks.length > 0) {
      return {
        statusCode: 409, // Conflict
        body: JSON.stringify({ message: `You have already submitted picks for Week ${data.picks[0].week}.` }),
      };
    }
    
    const records = data.picks.map(pick => ({
      fields: {
        'Player': data.playerName, 'Week': parseInt(pick.week, 10),
        'Away Team': pick.away, 'Home Team': pick.home,
        'Pick': pick.pick, 'Value': parseInt(pick.value, 10),
      },
    }));

    const chunkSize = 10;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await base('Picks').create(chunk);
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Picks submitted successfully!" }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: `Airtable Error: ${error.message}` }) };
  }
};