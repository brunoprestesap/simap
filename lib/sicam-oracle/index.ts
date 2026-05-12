export {
  getSicamOracleConfig,
  isSicamOracleConfigured,
  describeSicamOracleConfigForUi,
} from "./config";
export type { SicamOracleConfig } from "./config";

export {
  getSicamOraclePool,
  closeSicamOraclePool,
  executeSicamQuery,
} from "./client";
export type { SicamQueryOptions } from "./client";

export {
  pingSicam,
  listSicamObjects,
  describeSicamObject,
} from "./health";
export type {
  SicamHealth,
  SicamObjectSummary,
  SicamObjectType,
  SicamColumnSummary,
  ListObjectsOptions,
} from "./health";

export { SicamOracleError, extractOraCode, wrapSicamOracleError } from "./errors";
