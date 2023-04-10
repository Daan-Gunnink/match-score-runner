const axios = require("axios");
const { MongoClient } = require("mongodb");
const uri = process.env.DB_CONNECTION_STRING;
const client = new MongoClient(uri);
const supportedCountries = ["DE", "BE", "FR", "IT", "ES", "NL", "PT", "AU"];

async function fetchCountries() {
  const response = await axios.get(
    "https://v3.football.api-sports.io/countries",
    {
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": process.env.API_KEY,
      },
    }
  );

  return response.data.response;
}

async function addCountriesToDatabase(countries) {
  const database = client.db("matchscore");
  const collection = database.collection("countries");
  const existingCountries = await collection.find().toArray();

  const countriesToBeAdded = countries.filter(
    (country) =>
      !existingCountries.some((dbCountry) => dbCountry.code === country.code)
  );

  if (countriesToBeAdded.length === 0) {
    return;
  }

  try {
    await collection.insertMany(countriesToBeAdded);
  } catch (error) {
    console.error("Error adding countries to database:", error);
  }
}

async function run() {
  try {
    const countries = await fetchCountries();
    const filteredCountries = countries.filter((country) =>
      supportedCountries.includes(country.code)
    );

    await addCountriesToDatabase(filteredCountries);
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
