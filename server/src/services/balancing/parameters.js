/**
 * Pseudocode:
 * 1) Load editable parameters for a config.
 * 2) Save edits for simulation.
 */

export const getBalancingParameters = async (configId) => {
  // TODO: Load editable parameters for the config from storage.
  return { configId, parameters: {} };
};

export const saveBalancingParameters = async (payload) => {
  // TODO: Persist parameter edits for simulation.
  return { saved: true, payload };
};
