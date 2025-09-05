const Airtable = require('airtable');
exports.handler = async function (event) {
  try {
    const recordsToUpdate = JSON.parse(event.body);
    const { AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID } = process.env;
    const base = new Airtable({ apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(AIRTABLE_BASE_ID);
    
    const chunkSize = 10;
    for (let i = 0; i < recordsToUpdate.length; i += chunkSize) {
        const chunk = recordsToUpdate.slice(i, i + chunkSize);
        await base('Schedule').update(chunk);
    }
    
    const records = await base('Schedule').select({ sort: [{field: "Week", direction: "asc"}] }).all();
    return { statusCode: 200, body: JSON.stringify(records) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};