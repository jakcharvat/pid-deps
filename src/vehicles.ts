import { z } from "zod";

const parseBool = (n: number): boolean => {
  switch (n) {
    case 0:
      return false;
    case 1:
      return true;
    default:
      throw new Error(`Invalid boolean value: ${n}. Expected 0 or 1.`);
  }
};

const state = z.enum(["dilny", "doco", "muz", "sluz", "zar"]);

const vehicleSchema = z.object({
  id: z.number(),
  state: state,
  number: z.coerce.number(),
  numberIndex: z.number(),
  plate: z.string().nullable(),
  operator: z.string(),
  manufacturer: z.string(),
  type: z.string(),
  lowFloor: z.number().transform(parseBool),
  traction: z.string(),
  airCondition: z.number().transform(parseBool),
  usbChargers: z.number().transform(parseBool),
  paint: z.string(),
  thumbnailUrl: z.string().nullable(),
  photoUrl: z.string().nullable(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const vehiclesSchema = z.array(vehicleSchema);
export type Vehicles = z.infer<typeof vehiclesSchema>;
