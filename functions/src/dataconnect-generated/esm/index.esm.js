import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'wireframe',
  location: 'us-central1'
};

export const createCadModelRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCadModel', inputVars);
}
createCadModelRef.operationName = 'CreateCadModel';

export function createCadModel(dcOrVars, vars) {
  return executeMutation(createCadModelRef(dcOrVars, vars));
}

export const listPublicCadModelsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicCadModels');
}
listPublicCadModelsRef.operationName = 'ListPublicCadModels';

export function listPublicCadModels(dc) {
  return executeQuery(listPublicCadModelsRef(dc));
}

export const createFeedbackRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateFeedback', inputVars);
}
createFeedbackRef.operationName = 'CreateFeedback';

export function createFeedback(dcOrVars, vars) {
  return executeMutation(createFeedbackRef(dcOrVars, vars));
}

export const getCadModelRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCadModel', inputVars);
}
getCadModelRef.operationName = 'GetCadModel';

export function getCadModel(dcOrVars, vars) {
  return executeQuery(getCadModelRef(dcOrVars, vars));
}

