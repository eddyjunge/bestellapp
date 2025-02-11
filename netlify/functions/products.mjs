import { createClient, fql } from "fauna";

// 1) Fauna-Client anlegen
const client = createClient({
  secret: process.env.FAUNA_SECRET,
  // Falls du in der EU-Region bist, setze domain: 'db.eu.fauna.com'
});

// 2) Netlify Function
export async function handler(event, context) {
  const method = event.httpMethod;

  try {
    // --------- GET (Produkte abrufen) ---------
    if (method === "GET") {
      // Wir lesen alle Dokumente aus "products" via FQL v10
      const result = await client.query(fql`
        let docs = all(documents("products"))
        docs
      `);

      // result ist ein Array von { document: { id, data } }
      const data = result.map(item => ({
        id: item.document.id,
        ...item.document.data
      }));

      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    }

    // --------- POST (Neues Produkt hinzufügen) ---------
    if (method === "POST") {
      // Body prüfen
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Leerer Body. Hast du JSON gesendet?" })
        };
      }
      // JSON parse
      let bodyData;
      try {
        bodyData = JSON.parse(event.body); // { name, price, ... }
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Ungültiges JSON im Body." })
        };
      }

      const { name, price, points, imageData } = bodyData;

      // Dokument in Fauna erstellen
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
      // createResult: { document: { id, data } }
      const doc = createResult.document;

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: doc.id,
          ...doc.data
        })
      };
    }

    // --------- DELETE (Produkt entfernen) ---------
    if (method === "DELETE") {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Keine Produkt-ID angegeben" })
        };
      }

      // Dokument löschen
      const delResult = await client.query(fql`
        deleteDocument(document("products", ${id}))
      `);

      // delResult: { document: { id, data } } oder null
      return {
        statusCode: 200,
        body: JSON.stringify(delResult)
      };
    }

    // --------- Andere Methoden -> 405 ---------
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