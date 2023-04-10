//Fetch the standings for all the leagues stored
const axios = require("axios");
const { result } = require("lodash");
const { MongoClient } = require("mongodb");
const uri = process.env.DB_CONNECTION_STRING;
const client = new MongoClient(uri);
const database = client.db("matchscore");

async function fetchCountries() {
  const collection = database.collection("countries");
  return await collection.find().toArray();
}

async function fetchLeaguesWithCoverageForCountry(countryCode) {
  const collection = database.collection("leagues");
  return await collection
    .find({ countryCode: countryCode, "coverage.standings": true })
    .toArray();
}

async function fetchStandingsForLeague(leagueId) {
  try {
    const response = await axios.get(
      "https://v3.football.api-sports.io/standings",
      {
        params: {
          league: leagueId,
          season: 2022,
        },
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    );

    if (response.data.errors.length !== 0) {
      throw Error(JSON.stringify(response.data.errors));
    }

    const dataResponse = response.data.response[0];
    dataResponse.league.standings = flattenStandings(
      dataResponse.league.standings
    )[0];

    return dataResponse.league;
  } catch (error) {
    throw error;
  }
}

function flattenStandings(data) {
  const updatedStandings = data.map((comp) => {
    return comp.map((team) => {
      return {
        rank: team.rank,
        team_id: team.team.id,
        team_name: team.team.name,
        team_logo: team.team.logo,
        points: team.points,
        goals_for: team.all.goals.for,
        goals_against: team.all.goals.against,
        goals_diff: team.all.goals.for - team.all.goals.against,
        group: team.group,
        form: team.form,
        status: team.status,
        description: team.description,
        all_played: team.all.played,
        all_win: team.all.win,
        all_draw: team.all.draw,
        all_lose: team.all.lose,
        home_played: team.home.played,
        home_goals_for: team.home.goals.for,
        home_goals_against: team.home.goals.against,
        home_win: team.home.win,
        home_draw: team.home.draw,
        home_lose: team.home.lose,
        away_played: team.away.played,
        away_goals_for: team.away.goals.for,
        away_goals_against: team.away.goals.against,
        away_win: team.away.win,
        away_draw: team.away.draw,
        away_lose: team.away.lose,
      };
    });
  });

  return updatedStandings;
}

async function addStandingsToDatabase(standings) {
  const collection = database.collection("standings");
  const existingStandings = await collection.find().toArray();

  const standingsToBeAdded = standings.filter(
    (standing) =>
      !existingStandings.some((dbStanding) => dbStanding.id === standing.id)
  );

  const standingsToBeUpdated = standings.filter((standing) =>
    existingStandings.some((dbStanding) => dbStanding.id === standing.id)
  );

  console.log("Standings to be added:", standingsToBeAdded.length);
  console.log("standings to be updated:", standingsToBeUpdated.length);

  try {
    if (standingsToBeAdded.length > 0) {
      await collection.insertMany(standingsToBeAdded);
    }
    if (standingsToBeUpdated.length > 0) {
      const bulkOps = standingsToBeUpdated.map((standing) => ({
        replaceOne: {
          filter: { id: standing.id },
          replacement: standing,
          upsert: true,
        },
      }));
      await collection.bulkWrite(bulkOps);
    }
  } catch (error) {
    console.error("Error adding standings to database:", error);
  }
}

async function run() {
  try {
    const countries = await fetchCountries();

    for (country of countries) {
      await new Promise((resolve) => setTimeout(resolve, 60000));
      const leagues = await fetchLeaguesWithCoverageForCountry(country.code);
      const standings = await Promise.all(
        leagues.map(async (league) => {
          return await fetchStandingsForLeague(league.league.id);
        })
      );
      await addStandingsToDatabase(standings);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
