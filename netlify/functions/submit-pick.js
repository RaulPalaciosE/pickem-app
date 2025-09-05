const Airtable = require('airtable');

exports.handler = async function (event) {
  try {
    // Get the picks data sent from the form
    const data = JSON.parse(event.body);
    
    // Get the secret keys from Netlify's environment variables
    const {
      AIRTABLE_PERSONAL_ACCESS_TOKEN,
      AIRTABLE_BASE_ID,
      AIRTABLE_TABLE_NAME
    } = process.env;

    // Authenticate with the Personal Access Token
    const base = new Airtable({ apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(AIRTABLE_BASE_ID);

    // Prepare records for Airtable
    const records = data.picks.map(pick => ({
      fields: {
        'Player': data.playerName,
        'Week': parseInt(pick.week, 10),
        'Away Team': pick.away,
        'Home Team': pick.home,
        'Pick': pick.pick,
        'Value': parseInt(pick.value, 10),
      },
    }));

    // Send the records to Airtable
    await base(AIRTABLE_TABLE_NAME).create(records);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Picks submitted successfully!" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Airtable Error: ${error.message}` }),
    };
  }
};
