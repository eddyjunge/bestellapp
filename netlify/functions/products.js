// netlify/functions/products.js
const faunadb = require('faunadb');
const q = faunadb.query;

exports.handler = async (event, context) => {
  // Im Netlify-Dashboard musst du "FAUNA_SECRET" gesetzt haben
  const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET });

  const method = event.httpMethod;

  try {
    // --------- GET (Produkte abrufen) ---------
    if (method === 'GET') {
      const result = await client.query(
        q.Map(
          q.Paginate(q.Documents(q.Collection('products'))),
          q.Lambda(x => q.Get(x))
        )
      );
      // result.data ist ein Array von Fauna-Objekten
      const data = result.data.map(item => ({
        id: item.ref.id,
        name: item.data.name,
        price: item.data.price,
        points: item.data.points,
        imageData: item.data.imageData,
      }));

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }

    // --------- POST (Neues Produkt hinzufügen) ---------
    if (method === 'POST') {
      const body = JSON.parse(event.body);
      const { name, price, points, imageData } = body;

      const newItem = await client.query(
        q.Create(
          q.Collection('products'),
          { data: { name, price, points, imageData } }
        )
      );
      
      // newItem enthält die neu erstellte Ressource
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: newItem.ref.id,
          ...newItem.data
        }),
      };
    }

    // --------- DELETE (Produkt entfernen) ---------
    if (method === 'DELETE') {
      // Produkt-ID wird per Query-String mitgegeben: ?id=123
      const id = event.queryStringParameters.id;
      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Keine Produkt-ID angegeben" }),
        };
      }

      const deletedItem = await client.query(
        q.Delete(q.Ref(q.Collection('products'), id))
      );

      // deletedItem enthält das gelöschte Dokument
      return {
        statusCode: 200,
        body: JSON.stringify({ id: deletedItem.ref.id }),
      };
    }

    // --------- Andere Methoden -> Fehlermeldung ---------
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (err) {
    console.error('Fehler in der Netlify Function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};