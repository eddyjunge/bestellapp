import { createClient, fql } from "fauna";

// Fauna-Client initialisieren (verwende ggf. den richtigen Domain-Wert, z.B. für EU: 'db.eu.fauna.com')
const client = createClient({
  secret: process.env.FAUNA_SECRET,
  // domain: 'db.eu.fauna.com',
});

export async function handler(event, context) {
  const method = event.httpMethod;
  
  try {
    // GET: Alle Produkte abrufen
    if (method === "GET") {
      // Verwende Paginate, Map und Lambda, um alle Dokumente aus der Collection "products" zu holen
      const result = await client.query(fql`
        Map(
          Paginate(Documents(Collection("products"))),
          Lambda("ref", Get(Var("ref")))
        )
      `);
      // Das Ergebnis enthält ein Objekt mit einer data-Eigenschaft
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
      
      // Mit der Create()-Funktion ein neues Dokument in der Collection "products" erstellen
      const createResult = await client.query(fql`
        Create(Collection("products"), {
          data: {
            name: ${name},
            price: ${price},
            points: ${points},
            imageData: ${imageData}
          }
        })
      `);
      // Das Erstellungsresultat enthält unter anderem den Verweis (ref) und die Daten
      const doc = createResult;
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: doc.ref.id,
          ...doc.data
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
      // Lösche das Dokument über den Ref-Aufbau: Ref(Collection("products"), id)
      const delResult = await client.query(fql`
        Delete(Ref(Collection("products"), ${id}))
      `);
      return {
        statusCode: 200,
        body: JSON.stringify(delResult)
      };
    }
    
    // Für andere HTTP-Methoden:
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