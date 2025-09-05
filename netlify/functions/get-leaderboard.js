const Airtable = require('airtable');
exports.handler = async function () {
  try {
    const { AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID } = process.env;
    const base = new Airtable({ apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(AIRTABLE_BASE_ID);
    
    const [players, scores] = await Promise.all([
      base('Players').select({ fields: ["Name"] }).all(),
      base('Scores').select({ fields: ["Player", "Week", "Score"] }).all()
    ]);

    const playerMap = players.reduce((acc, player) => {
        acc[player.id] = player.get("Name");
        return acc;
    }, {});

    const formattedScores = scores.map(score => ({
        Player: playerMap[score.get("Player")[0]],
        Week: score.get("Week"),
        Score: score.get("Score")
    }));

    return { statusCode: 200, body: JSON.stringify(formattedScores) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};