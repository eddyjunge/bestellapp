import { createClient, fql } from 'fauna';

/**
 * ACHTUNG:
 * - Du brauchst "type": "module" in deiner package.json
 * - "fauna" statt "faunadb"
 * - Netlify nutzt diese Datei als ES Module
 */

// 1) Fauna-Client anlegen
const client = createClient({
  secret: process.env.FAUNA_SECRET,
  // Falls du in einer EU-Region bist, könnte zusätzlich "domain" nötig sein, z. B.:
  // domain: 'db.eu.fauna.com',
});

// 2) Netlify-Function (handler)
export async function handler(event) {
  const method = event.httpMethod;

  try {
    // --------- GET (Produkte abrufen) ---------
    if (method === 'GET') {
      // Wir holen alle Documents in "products"
      // "all()" liest alle Seiten (Vorsicht bei sehr vielen Einträgen)
      const result = await client.query(fql`
        let docs = all(documents("products"))
        docs
      `);
      // result ist ein Array von Objekten mit shape [{ document: {...} }, ...]
      // Wir können es in ein reines Array mit {id, ...data} umwandeln:
      const data = result.map((item) => {
        return {
          id: item.document.id,
          ...item.document.data
        };
      });

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }

    // --------- POST (Neues Produkt hinzufügen) ---------
    if (method === 'POST') {
      // 1) Body prüfen
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Leerer Body. Hast du JSON gesendet?' }),
        };
      }

      // 2) JSON parse
      let body;
      try {
        body = JSON.parse(event.body); // { name, price, points, imageData }
      } catch (parseErr) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Ungültiges JSON im Body.' }),
        };
      }

      // 3) Dokument anlegen (FQL v10)
      const { name, price, points, imageData } = body;
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
      // createResult hat shape { document: { id, data: {...} } }
      const doc = createResult.document;

      return {
        statusCode: 200,
        body: JSON.stringify({
          id: doc.id,
          ...doc.data
        }),
      };
    }

    // --------- DELETE (Produkt entfernen) ---------
    if (method === 'DELETE') {
      // Produkt-ID per ?id=123
      const id = event.queryStringParameters?.id;
      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Keine Produkt-ID angegeben' }),
        };
      }

      // Wir löschen das Document in "products" mit passender ID
      const deleteResult = await client.query(fql`
        deleteDocument(document("products", ${id}))
      `);
      // deleteResult: { document: { id, data } } oder null, wenn schon gelöscht

      return {
        statusCode: 200,
        body: JSON.stringify(deleteResult),
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
}