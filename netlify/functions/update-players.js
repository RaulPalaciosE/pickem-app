const Airtable = require('airtable');
exports.handler = async function (event) {
  try {
    const data = JSON.parse(event.body);
    const { AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID } = process.env;
    const base = new Airtable({ apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN }).base(AIRTABLE_BASE_ID);
    
    const chunkSize = 10;
    if (data.created && data.created.length > 0) {
        for (let i = 0; i < data.created.length; i += chunkSize) {
            await base('Players').create(data.created.slice(i, i + chunkSize));
        }
    }
    if (data.updated && data.updated.length > 0) {
        for (let i = 0; i < data.updated.length; i += chunkSize) {
            await base('Players').update(data.updated.slice(i, i + chunkSize));
        }
    }
    if (data.deleted && data.deleted.length > 0) {
        for (let i = 0; i < data.deleted.length; i += chunkSize) {
            await base('Players').destroy(data.deleted.slice(i, i + chunkSize));
        }
    }
    
    const records = await base('Players').select().all();
    return { statusCode: 200, body: JSON.stringify(records) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};