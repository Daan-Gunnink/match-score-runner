const axios = require("axios");
const { result } = require("lodash");
const { MongoClient } = require("mongodb");
const uri = process.env.DB_CONNECTION_STRING;
const client = new MongoClient(uri);

async function fetchLeaguesForCountry(countryCode) {
  const response = await axios.get(
    "https://v3.football.api-sports.io/leagues",
    {
      params: {
        code: countryCode,
      },
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": process.env.API_KEY,
      },
    }
  );

  const leagues = response.data.response
    .sort((a, b) => {
      a.id - b.id;
    })
    .slice(0, 5)
    .map((league) => {
      return {
        league: league.league,
        countryCode: league.country.code,
        coverage: league.seasons[0].coverage
      };
    });

  return leagues;
}

async function fetchCountries() {
  const database = client.db("matchscore");
  const collection = database.collection("countries");
  return await collection.find().toArray();
}

async function addLeaguesToDatabase(leagues) {
  const database = client.db("matchscore");
  const collection = database.collection("leagues");
  const existingLeagues = await collection.find().toArray();

  const leaguesToBeAdded = leagues.filter(
    (league) => !existingLeagues.some((dbLeague) => dbLeague.league.id === league.league.id)
  );

  if (leaguesToBeAdded.length === 0) {
    return;
  }

  try {
    await collection.insertMany(leaguesToBeAdded);
  } catch (error) {
    console.error("Error adding leagues to database:", error);
  }
}

async function run() {
  try {
    const countries = (await fetchCountries());
    const leagues = (await Promise.all(
      countries.map(
        async (country) => await fetchLeaguesForCountry(country.code)
      )
    )).flat()
    await addLeaguesToDatabase(leagues);
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
