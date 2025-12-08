const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'wireframe',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const createCadModelRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateCadModel', inputVars);
}
createCadModelRef.operationName = 'CreateCadModel';
exports.createCadModelRef = createCadModelRef;

exports.createCadModel = function createCadModel(dcOrVars, vars) {
  return executeMutation(createCadModelRef(dcOrVars, vars));
};

const listPublicCadModelsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPublicCadModels');
}
listPublicCadModelsRef.operationName = 'ListPublicCadModels';
exports.listPublicCadModelsRef = listPublicCadModelsRef;

exports.listPublicCadModels = function listPublicCadModels(dc) {
  return executeQuery(listPublicCadModelsRef(dc));
};

const createFeedbackRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateFeedback', inputVars);
}
createFeedbackRef.operationName = 'CreateFeedback';
exports.createFeedbackRef = createFeedbackRef;

exports.createFeedback = function createFeedback(dcOrVars, vars) {
  return executeMutation(createFeedbackRef(dcOrVars, vars));
};

const getCadModelRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCadModel', inputVars);
}
getCadModelRef.operationName = 'GetCadModel';
exports.getCadModelRef = getCadModelRef;

exports.getCadModel = function getCadModel(dcOrVars, vars) {
  return executeQuery(getCadModelRef(dcOrVars, vars));
};
