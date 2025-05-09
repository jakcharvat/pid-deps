import { departuresSchema, type Departure } from "./deps";
import { table } from "./table";
import { vehiclesSchema } from "./vehicles";

const STOP_ID = "U12Z3P";

function assert(condition: boolean, message: string = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const GOLEMIO_API_KEY = Bun.env["GOLEMIO_API_KEY"];
assert(GOLEMIO_API_KEY !== undefined);

const vehiclesRes = await fetch("https://seznam-autobusu.cz/api/ropid/pid");
const vehicles = vehiclesSchema.parse(await vehiclesRes.json());

const activeDppVehicles = vehicles.filter(
  (v) => v.operator === "Dopravní podnik hl. m. Prahy" && v.state === "zar",
);

const activeDppVehiclesNums = activeDppVehicles.map((v) => v.number);
assert(
  activeDppVehiclesNums.length === new Set(activeDppVehiclesNums).size,
  "Duplicate vehicle numbers found in active DPP vehicles",
);

const numberToVehicle = Object.fromEntries(activeDppVehicles.map((v) => [v.number, v]));

const depsQuery = encodeURIComponent(JSON.stringify({ "0": [STOP_ID] }));
const depsUrl = `https://api.golemio.cz/v2/public/departureboards?stopIds=${depsQuery}`;
const depsHeaders = {
  accept: "application/json",
  "X-Access-Token": GOLEMIO_API_KEY,
};

const depsRes = await fetch(depsUrl, { headers: depsHeaders });
const deps = departuresSchema.parse(await depsRes.json());

const aircon = (d: Departure) => (d.vehicle.is_air_conditioned ? "❄︎" : "");
// const wheelchair = (d: Departure) => (d.vehicle.is_wheelchair_accessible ? "♿︎" : "");

const vehicle = (d: Departure) => {
  const idSplit = d.vehicle.id.split("-");
  const id = idSplit[idSplit.length - 1];

  const v = numberToVehicle[id];
  assert(!!v, `Unknown vehicle number: ${v}`);

  return `${id} ${v.type}`;
};

const toHhMm = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

console.log(
  table(deps.flat(), [
    {
      header: "Departure",
      subcolumns: [(d) => d.departure.minutes, (d) => toHhMm(d.departure.timestamp_predicted)],
    },
    {
      header: "Vehicle",
      subcolumns: [aircon, vehicle],
    },
    {
      header: "Headsign",
      value: (d) => `${d.route.short_name} ${d.trip.headsign}`,
    },
  ]),
);
