import { Command } from "commander";
import { departuresSchema, type Departure } from "./deps";
import { table } from "./table";
import { vehiclesSchema } from "./vehicles";

const parseNum =
  (option: string) =>
  (x: string): number => {
    const val = parseInt(x);
    if (!Number.isNaN(val)) return val;
    throw new Error(`'${x}' is not a valid argument for integer option ${option}`);
  };

const cli = new Command()
  .name("deps")
  .description("Display upcoming departures from a PID stop.")
  .version("0.1.0")
  .option("-n, --count <count>", "Maximum number of departures to fetch", parseNum("--count"), 6)
  .option(
    "-l, --lines <numbers...>",
    "Filter by line number(s)",
    (value, previous) => [...(previous || []), parseNum("--lines")(value)],
    [] as number[],
  );

const opts = cli.parse().opts();

const STOP_ID = "U12Z3P";

function assert(condition: boolean, message: string = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const GOLEMIO_API_KEY = Bun.env["GOLEMIO_API_KEY"];
assert(GOLEMIO_API_KEY !== undefined, "GOLEMIO_API_KEY environment variable is not defined");

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

const depsQueryParams: [string, any][] = [
  ["stopIds", JSON.stringify({ "0": [STOP_ID] })],
  ["limit", opts.count],
  ...opts.lines.map((l: number) => ["routeShortNames", l]),
];

const encodedDeps = depsQueryParams
  .map((x) => x.map(String).map(encodeURIComponent).join("="))
  .join("&");

const depsUrl = `https://api.golemio.cz/v2/public/departureboards?${encodedDeps}`;
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

const depIn = (d: Departure) => (d.departure.minutes === 0 ? "<1" : d.departure.minutes);
const depAt = (d: Departure): string => {
  const date = new Date(d.departure.timestamp_predicted);
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
      subcolumns: [depIn, depAt],
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
