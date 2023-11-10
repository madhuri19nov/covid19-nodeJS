const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    cases: dbObject.cases,
  };
};

app.get("/states/", async (request, response) => {
  const stateNames = `SELECT * FROM state`;

  const allStatesArray = await db.all(stateNames);

  response.send(
    allStatesArray.map((eachObject) =>
      convertDbObjectToResponseObject(eachObject)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `SELECT * FROM state WHERE state_id= ${stateId}`;
  const stateDetails = await db.get(stateQuery);

  response.send(convertDbObjectToResponseObject(stateDetails));
});

app.post("/districts/", async (request, response) => {
  const newDistrict = request.body;

  const { districtName, stateId, cases, cured, active, deaths } = newDistrict;

  const addingNewDistrict = `INSERT INTO 
    district(
        district_name, 
        state_id, 
        cases, 
        cured, 
        active, 
        deaths
        ) 
    VALUES(
        '${districtName}', 
        '${stateId}', 
        '${cases}',
        '${cured}', 
        '${active}', 
        '${deaths}'
        ) `;
  const dbresponse = await db.run(addingNewDistrict);
  const newDistrictDetails = dbresponse.lastId;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = `SELECT * FROM district WHERE district_id= ${districtId}`;
  const districtArray = await db.get(districtDetails);

  response.send(convertDbObjectToResponseObject(districtArray));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictDetails = `DELETE * FROM district WHERE district_id= ${districtId}`;
  await db.run(deleteDistrictDetails);

  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictDetails = ` UPDATE district 
  SET 
   district_name = '${districtName}',
        state_id= '${stateId}',
        cases = '${cases}',        
        cured = '${cured}', 
        active ='${active}', 
        deaths = '${deaths}'
  WHERE district_id = ${districtId}`;

  await db.run(updateDistrictDetails);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateDetails = `SELECT 
        SUM(cases),
        SUM(cured),
        SUM(active),
        SUM(deaths) 
FROM district WHERE state_id= ${stateId}`;
  const stateInfo = await db.get(stateDetails);

  response.send({
    totalCases: stateInfo["SUM(cases)"],
    totalCured: stateInfo["SUM(cured)"],
    totalActive: stateInfo["SUM(active)"],
    totalDeaths: stateInfo["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    `; //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery);
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    `; //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await database.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
}); //sending the required response

module.exports = app;
