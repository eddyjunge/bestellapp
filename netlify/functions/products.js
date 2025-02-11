// netlify/functions/products.js
const faunadb = require('faunadb');
const q = faunadb.query;

// Initialisiere den FaunaDB-Client mit dem Server-Schlüssel aus der Umgebungsvariable
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SERVER_SECRET
});

exports.handler = async (event, context) => {
  // GET-Methode: Alle Produkte abrufen
  if (event.httpMethod === 'GET') {
    try {
      const result = await client.query(
        q.Map(
          q.Paginate(q.Documents(q.Collection('products'))),
          q.Lambda('ref', q.Get(q.Var('ref')))
        )
      );
      return {
        statusCode: 200,
        body: JSON.stringify(result.data)
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: Fehler: ${error}
      };
    }
  }

  // POST-Methode: Ein neues Produkt hinzufügen
  else if (event.httpMethod === 'POST') {
    try {
      // Lese die übermittelten Daten aus dem Request-Body
      const data = JSON.parse(event.body);

      // Erstelle ein neues Dokument in der Collection 'products'
      const result = await client.query(
        q.Create(q.Collection('products'), { data })
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: Fehler: ${error}
      };
    }
  }

  // Für andere HTTP-Methoden:
  return { statusCode: 405, body: 'Method Not Allowed' };
};