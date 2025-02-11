import { createClient, fql } from "fauna";

// Fauna-Client initialisieren
const client = createClient({
  secret: process.env.FAUNA_SECRET,
  // Falls du in einer EU-Region bist, setze hier z. B.: domain: 'db.eu.fauna.com'
});

export async function handler(event, context) {
  const method = event.httpMethod;

  try {
    // GET – Alle Produkte abrufen
    if (method === "GET") {
      const result = await client.query(fql`
        let docs = all(documents("products"))
        docs
      `);
      const data = result.map(item => ({
        id: item.document.id,
        ...item.document.data
      }));
      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    // POST – Neues Produkt hinzufügen
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
      const createResult = await client.query(fql`
        createDocument({
          collection: "products",
          data: {
            name: ${name},
            price: ${price},
            points: ${points},
            imageData: ${imageData}
          }
        })
      `);
      const doc = createResult.document;
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: doc.id,
          ...doc.data
        })
      };
    }

    // DELETE – Produkt entfernen
    if (method === "DELETE") {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Keine Produkt-ID angegeben" })
        };
      }
      const delResult = await client.query(fql`
        deleteDocument(document("products", ${id}))
      `);
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