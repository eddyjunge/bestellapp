import faunadb from "faunadb";

// Den FaunaDB-Client instanziieren
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET,
  // Optional: domain: 'db.eu.fauna.com',
});

// Alias für die Query-Funktionen
const q = faunadb.query;

export async function handler(event, context) {
  const method = event.httpMethod;
  
  try {
    // GET: Alle Produkte abrufen
    if (method === "GET") {
      const result = await client.query(
        q.Map(
          q.Paginate(q.Documents(q.Collection("products"))),
          q.Lambda("ref", q.Get(q.Var("ref")))
        )
      );
      // result.data enthält alle Dokumente
      const data = result.data.map(doc => ({
        id: doc.ref.id,
        ...doc.data
      }));
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    // POST: Neues Produkt anlegen
    if (method === "POST") {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Leerer Body. Hast du JSON gesendet?" })
        };
      }
      
      let bodyData;
      try {
        bodyData = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Ungültiges JSON im Body." })
        };
      }
      
      const { name, price, points, imageData } = bodyData;
      
      const createResult = await client.query(
        q.Create(q.Collection("products"), {
          data: { name, price, points, imageData }
        })
      );
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: createResult.ref.id,
          ...createResult.data
        })
      };
    }

    // DELETE: Ein Produkt löschen
    if (method === "DELETE") {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Keine Produkt-ID angegeben" })
        };
      }
      const delResult = await client.query(
        q.Delete(q.Ref(q.Collection("products"), id))
      );
      return {
        statusCode: 200,
        body: JSON.stringify(delResult)
      };
    }
    
    // Andere HTTP-Methoden nicht erlaubt
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  } catch (err) {
    console.error("Fehler in der Netlify Function:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}