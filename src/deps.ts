import { z } from "zod";

const departureSchema = z.object({
  timestamp_scheduled: z.string(),
  timestamp_predicted: z.string(),
  delay_seconds: z.number(),
  minutes: z.number(),
});

const stopSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  platform_code: z.string(),
});

const routeSchema = z.object({
  type: z.string(),
  short_name: z.string(),
});

const tripSchema = z.object({
  id: z.string(),
  headsign: z.string(),
  is_canceled: z.boolean(),
});

const vehicleSchema = z.object({
  id: z.string(),
  is_wheelchair_accessible: z.boolean(),
  is_air_conditioned: z.boolean(),
  has_charger: z.boolean(),
});

const departureItemSchema = z.object({
  departure: departureSchema,
  stop: stopSchema,
  route: routeSchema,
  trip: tripSchema,
  vehicle: vehicleSchema,
});

export type Departure = z.infer<typeof departureItemSchema>;
export const departuresSchema = z.array(z.array(departureItemSchema));
