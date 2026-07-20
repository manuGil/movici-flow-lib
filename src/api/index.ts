import Client from "./client";

export enum CAPABILITIES {
  USER = "user",
  GEOCODE = "geocode",
  PROJECTS = "projects",
  PATCH_DATASETS = "patchDatasets",
}

export { Client };
export * from "./requests";
